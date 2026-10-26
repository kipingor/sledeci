<?php

namespace Sledeci\Accounting\Services\Forex;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Sledeci\Accounting\Models\ForexRate;
use Sledeci\Accounting\Models\Invoice;
use Sledeci\Accounting\Models\Payment;

/**
 * ForexService
 *
 * Provides:
 *  - Live exchange rates (ExchangeRate-API or CBK API, with fallback)
 *  - Invoice conversion to functional currency (KES by default)
 *  - Realised forex gain/loss calculation on payment
 *  - Rate caching (1-hour TTL, with stale-on-error fallback)
 *
 * Usage:
 *   $rate = app(ForexService::class)->rate('USD', 'KES');
 *   $kes  = app(ForexService::class)->convert(1200, 'USD', 'KES');
 */
class ForexService
{
    private const CACHE_PREFIX = 'forex_rate_';

    private const CACHE_TTL = 3600; // 1 hour

    // African currencies we care about — drives the UI dropdowns
    public const AFRICAN_CURRENCIES = [
        'KES' => 'Kenyan Shilling',
        'UGX' => 'Ugandan Shilling',
        'TZS' => 'Tanzanian Shilling',
        'RWF' => 'Rwandan Franc',
        'ETB' => 'Ethiopian Birr',
        'GHS' => 'Ghanaian Cedi',
        'NGN' => 'Nigerian Naira',
        'ZAR' => 'South African Rand',
        'EGP' => 'Egyptian Pound',
        'MAD' => 'Moroccan Dirham',
        'XOF' => 'CFA Franc (West Africa)',
        'XAF' => 'CFA Franc (Central Africa)',
        'USD' => 'US Dollar',
        'EUR' => 'Euro',
        'GBP' => 'British Pound',
        'AED' => 'UAE Dirham',
        'CNY' => 'Chinese Yuan',
    ];

    // ─────────────────────────────────────────────────────────────────────────
    // Core rate lookup
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Get exchange rate: 1 $from = ? $to
     */
    public function rate(string $from, string $to): float
    {
        $from = strtoupper($from);
        $to = strtoupper($to);

        if ($from === $to) {
            return 1.0;
        }

        $cacheKey = self::CACHE_PREFIX."{$from}_{$to}";

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($from, $to) {
            return $this->fetchRate($from, $to);
        });
    }

    /**
     * Convert an amount from one currency to another.
     */
    public function convert(float $amount, string $from, string $to, int $decimals = 2): float
    {
        return round($amount * $this->rate($from, $to), $decimals);
    }

    /**
     * Get all rates from a base currency in a single API call.
     * Refreshes the cache for all pairs simultaneously.
     */
    public function refreshRates(string $base = 'KES'): array
    {
        $base = strtoupper($base);

        try {
            $response = Http::timeout(15)->get(
                'https://v6.exchangerate-api.com/v6/'.config('services.exchangerate_api.key')."/latest/{$base}"
            );

            if ($response->failed()) {
                throw new \RuntimeException('ExchangeRate-API HTTP error: '.$response->status());
            }

            $data = $response->json();
            $rates = $data['conversion_rates'] ?? [];

            foreach ($rates as $quote => $rate) {
                $cacheKey = self::CACHE_PREFIX."{$base}_{$quote}";
                Cache::put($cacheKey, (float) $rate, self::CACHE_TTL);

                // Persist to DB for historical reference and offline fallback
                ForexRate::updateOrCreate(
                    ['base_currency' => $base, 'quote_currency' => $quote],
                    [
                        'rate' => $rate,
                        'source' => 'exchangerate-api',
                        'fetched_at' => now(),
                    ]
                );
            }

            Log::info('Forex rates refreshed', ['base' => $base, 'count' => count($rates)]);

            return $rates;
        } catch (\Throwable $e) {
            Log::warning('Forex rate refresh failed, using DB fallback', ['error' => $e->getMessage()]);

            return $this->ratesFromDb($base);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Invoice / Payment helpers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Stamp an invoice with the current exchange rate and functional total.
     * Call this when an invoice is created or issued.
     *
     * @param  string  $functionalCurrency  e.g. 'KES'
     */
    public function stampInvoice(Invoice $invoice, string $functionalCurrency = 'KES'): void
    {
        if ($invoice->currency === $functionalCurrency) {
            $invoice->update([
                'exchange_rate' => 1.0,
                'functional_currency' => $functionalCurrency,
                'functional_total' => $invoice->total,
            ]);

            return;
        }

        $rate = $this->rate($invoice->currency, $functionalCurrency);
        $functionalTotal = round((float) $invoice->total * $rate, 4);

        $invoice->update([
            'exchange_rate' => $rate,
            'functional_currency' => $functionalCurrency,
            'functional_total' => $functionalTotal,
        ]);
    }

    /**
     * Calculate and record forex gain/loss when a payment is recorded.
     *
     * If the invoice was invoiced at rate R1 but payment arrives at rate R2,
     * the difference is a realised forex gain (R2 > R1) or loss (R2 < R1).
     */
    public function recordPaymentForex(Payment $payment, string $functionalCurrency = 'KES'): void
    {
        $invoice = $payment->invoice;
        if (! $invoice || $invoice->currency === $functionalCurrency) {
            return;
        }

        // Rate at time of payment
        $paymentRate = $this->rate($invoice->currency, $functionalCurrency);
        $functionalAmount = round((float) $payment->amount * $paymentRate, 4);

        $payment->update([
            'exchange_rate' => $paymentRate,
            'functional_amount' => $functionalAmount,
        ]);

        // Realised gain/loss = (payment rate - invoice rate) × payment amount
        $invoiceRate = (float) $invoice->exchange_rate;
        if ($invoiceRate > 0) {
            $gainLoss = round(($paymentRate - $invoiceRate) * (float) $payment->amount, 4);
            $invoice->increment('forex_gain_loss', $gainLoss);
        }
    }

    /**
     * Build a multi-currency summary for the dashboard.
     * Converts all outstanding invoice totals to the functional currency.
     *
     * @return array{total_kes: float, by_currency: array}
     */
    public function buildMultiCurrencySummary(string $functionalCurrency = 'KES'): array
    {
        $invoices = Invoice::whereNotIn('status', ['draft', 'cancelled'])
            ->selectRaw('currency, SUM(total) as total, SUM(total - COALESCE(functional_total,0)) as fx_exposure')
            ->groupBy('currency')
            ->get();

        $totalFunctional = 0;
        $byCurrency = [];

        foreach ($invoices as $row) {
            $rate = $this->rate($row->currency, $functionalCurrency);
            $converted = round((float) $row->total * $rate, 2);
            $totalFunctional += $converted;

            $byCurrency[] = [
                'currency' => $row->currency,
                'total' => (float) $row->total,
                'rate' => $rate,
                'converted' => $converted,
                'functional' => $functionalCurrency,
            ];
        }

        return [
            'functional_currency' => $functionalCurrency,
            'total' => round($totalFunctional, 2),
            'by_currency' => $byCurrency,
        ];
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Private helpers
    // ─────────────────────────────────────────────────────────────────────────

    private function fetchRate(string $from, string $to): float
    {
        // Try ExchangeRate-API
        try {
            $response = Http::timeout(10)->get(
                'https://v6.exchangerate-api.com/v6/'.config('services.exchangerate_api.key')."/pair/{$from}/{$to}"
            );

            if ($response->ok()) {
                $rate = (float) $response->json('conversion_rate');
                if ($rate > 0) {
                    // Persist to DB
                    ForexRate::updateOrCreate(
                        ['base_currency' => $from, 'quote_currency' => $to],
                        ['rate' => $rate, 'source' => 'exchangerate-api', 'fetched_at' => now()]
                    );

                    return $rate;
                }
            }
        } catch (\Throwable $e) {
            Log::warning("Forex API failed for {$from}/{$to}", ['error' => $e->getMessage()]);
        }

        // Fallback: use most recent DB rate
        return $this->rateFromDb($from, $to);
    }

    private function rateFromDb(string $from, string $to): float
    {
        $row = ForexRate::where('base_currency', $from)
            ->where('quote_currency', $to)
            ->latest('fetched_at')
            ->first();

        if ($row) {
            return (float) $row->rate;
        }

        // Cross-rate via USD if direct pair missing
        $fromUsd = ForexRate::where('base_currency', 'USD')->where('quote_currency', $from)->latest('fetched_at')->value('rate');
        $toUsd = ForexRate::where('base_currency', 'USD')->where('quote_currency', $to)->latest('fetched_at')->value('rate');

        if ($fromUsd && $toUsd) {
            return round((float) $toUsd / (float) $fromUsd, 8);
        }

        Log::error("No forex rate available for {$from}/{$to}");

        return 1.0; // last resort: treat as parity
    }

    private function ratesFromDb(string $base): array
    {
        return ForexRate::where('base_currency', $base)
            ->latest('fetched_at')
            ->get()
            ->pluck('rate', 'quote_currency')
            ->map(fn ($r) => (float) $r)
            ->toArray();
    }
}

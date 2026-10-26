<?php

namespace App\Services\Accounting;

use App\Models\AccountingPeriod;
use App\Models\ChartOfAccount;
use App\Models\ExchangeRate;
use App\Models\Expense;
use App\Models\Invoice;
use App\Models\JournalEntry;
use App\Models\JournalEntryLine;
use App\Models\Payment;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * PostingEngine
 *
 * Converts source documents (Invoice, Payment, Expense) into
 * IFRS-compliant double-entry journal entries.
 *
 * ── REVENUE RECOGNITION (IFRS 15) ───────────────────────────────────────────
 *
 * Invoicing:
 *   Dr  Accounts Receivable (1100)      invoice.total
 *   Cr  Revenue (6100)                  invoice.subtotal
 *   Cr  VAT Payable (3400)              invoice.tax       [if taxed]
 *
 * Revenue is recognised at point of invoicing (performance obligation satisfied).
 * This is accrual basis — NOT when cash is received.
 *
 * Payment receipt:
 *   Dr  Bank / Cash (1020)              payment.amount
 *   Cr  Accounts Receivable (1100)      payment.amount
 *
 * ── EXPENSE RECOGNITION ──────────────────────────────────────────────────────
 *
 *   Dr  Expense Account (8xxx)          expense.amount
 *   Cr  Accounts Payable / Bank (3100)  expense.amount    [if unpaid]
 *   or
 *   Cr  Bank (1020)                     expense.amount    [if paid directly]
 *
 * ── IAS 21 FOREIGN CURRENCY ─────────────────────────────────────────────────
 *
 * When invoice.currency ≠ functional_currency:
 *   - Amounts are translated at the spot rate on transaction date
 *   - Both foreign_amount and functional amount are stored per line
 *   - FX gain/loss on settlement is recognised in P&L (accounts 6400 / 9200)
 */
class PostingEngine
{
    private string $functionalCurrency;

    public function __construct()
    {
        $this->functionalCurrency = config('accounting.functional_currency', 'KES');
    }

    // ── Invoice Posting ────────────────────────────────────────────────────────

    /**
     * Post an invoice to the ledger (IFRS 15 revenue recognition).
     *
     * @throws \RuntimeException if the invoice is already posted or the period is closed
     */
    public function postInvoice(Invoice $invoice): JournalEntry
    {
        if ($invoice->posting_status === 'posted') {
            throw new \RuntimeException("Invoice {$invoice->number} is already posted.");
        }

        $period = $this->requireOpenPeriod($invoice->issue_date);
        $ar = $this->requireAccount('1100', 'Accounts Receivable');

        // IAS 21: resolve exchange rate if foreign currency
        [$exchangeRate, $functionalTotal] = $this->resolveFX(
            $invoice->total,
            $invoice->currency,
            Carbon::parse($invoice->issue_date)
        );

        return DB::transaction(function () use ($invoice, $period, $ar, $exchangeRate, $functionalTotal) {
            $je = JournalEntry::create([
                'period_id' => $period->id,
                'entry_date' => $invoice->issue_date,
                'type' => 'invoice',
                'memo' => "Invoice {$invoice->number} — {$invoice->client?->name}",
                'functional_currency' => $this->functionalCurrency,
                'source_type' => Invoice::class,
                'source_id' => $invoice->id,
                'created_by' => Auth::id(),
                'status' => 'draft',
            ]);

            // Get revenue account — use default service revenue if no mapping
            $revenueAccount = $this->requireAccount('6100', 'Service Revenue');

            $lines = [];

            if ($invoice->currency !== $this->functionalCurrency) {
                // ── Foreign currency invoice (IAS 21) ─────────────────────────
                // Debit AR in functional currency equivalent
                $lines[] = [
                    'journal_entry_id' => $je->id,
                    'account_id' => $ar->id,
                    'type' => 'debit',
                    'amount' => $functionalTotal,
                    'foreign_currency' => $invoice->currency,
                    'foreign_amount' => (float) $invoice->total,
                    'exchange_rate' => $exchangeRate,
                    'description' => "AR — {$invoice->number}",
                    'client_id' => $invoice->client_id,
                    'project_id' => $invoice->project_id,
                    'line_order' => 1,
                ];

                $functionalSubtotal = round((float) $invoice->subtotal * $exchangeRate, 4);
                $functionalTax = round((float) $invoice->tax * $exchangeRate, 4);

                // Credit Revenue
                $lines[] = [
                    'journal_entry_id' => $je->id,
                    'account_id' => $revenueAccount->id,
                    'type' => 'credit',
                    'amount' => $functionalSubtotal,
                    'foreign_currency' => $invoice->currency,
                    'foreign_amount' => (float) $invoice->subtotal,
                    'exchange_rate' => $exchangeRate,
                    'description' => "Revenue — {$invoice->number}",
                    'client_id' => $invoice->client_id,
                    'project_id' => $invoice->project_id,
                    'line_order' => 2,
                ];

                if ($functionalTax > 0) {
                    $vatAccount = $this->requireAccount('3400', 'VAT Payable');
                    $lines[] = [
                        'journal_entry_id' => $je->id,
                        'account_id' => $vatAccount->id,
                        'type' => 'credit',
                        'amount' => $functionalTax,
                        'foreign_currency' => $invoice->currency,
                        'foreign_amount' => (float) $invoice->tax,
                        'exchange_rate' => $exchangeRate,
                        'description' => "VAT — {$invoice->number}",
                        'line_order' => 3,
                    ];
                }
            } else {
                // ── Functional currency invoice ────────────────────────────────
                // Debit AR
                $lines[] = [
                    'journal_entry_id' => $je->id,
                    'account_id' => $ar->id,
                    'type' => 'debit',
                    'amount' => (float) $invoice->total,
                    'description' => "AR — {$invoice->number}",
                    'client_id' => $invoice->client_id,
                    'project_id' => $invoice->project_id,
                    'line_order' => 1,
                ];
                // Credit Revenue
                $lines[] = [
                    'journal_entry_id' => $je->id,
                    'account_id' => $revenueAccount->id,
                    'type' => 'credit',
                    'amount' => (float) $invoice->subtotal,
                    'description' => "Revenue — {$invoice->number}",
                    'client_id' => $invoice->client_id,
                    'project_id' => $invoice->project_id,
                    'line_order' => 2,
                ];
                // Credit VAT if applicable
                if ((float) $invoice->tax > 0) {
                    $vatAccount = $this->requireAccount('3400', 'VAT Payable');
                    $lines[] = [
                        'journal_entry_id' => $je->id,
                        'account_id' => $vatAccount->id,
                        'type' => 'credit',
                        'amount' => (float) $invoice->tax,
                        'description' => "VAT — {$invoice->number}",
                        'line_order' => 3,
                    ];
                }
            }

            $this->insertLines($lines);

            // Post immediately
            $this->post($je);

            // Update invoice with journal entry reference
            $invoice->update([
                'journal_entry_id' => $je->id,
                'posting_status' => 'posted',
                'exchange_rate' => $exchangeRate,
                'functional_currency' => $this->functionalCurrency,
                'functional_total' => $functionalTotal,
            ]);

            return $je->fresh(['lines.account']);
        });
    }

    // ── Payment Posting ────────────────────────────────────────────────────────

    /**
     * Post a payment receipt.
     * Dr Bank / Cash
     * Cr Accounts Receivable
     *
     * If there is an FX difference between invoice date and payment date,
     * the gain/loss is recognised in accounts 6400 / 9200 (IAS 21.28).
     */
    public function postPayment(Payment $payment): JournalEntry
    {
        if ($payment->posting_status === 'posted') {
            throw new \RuntimeException("Payment {$payment->id} is already posted.");
        }

        $invoice = $payment->invoice;
        $paidAt = Carbon::parse($payment->paid_at ?? now());
        $period = $this->requireOpenPeriod($paidAt);
        $ar = $this->requireAccount('1100', 'Accounts Receivable');

        // Determine bank/cash account
        $bankAccountId = $payment->bank_account_id
            ?? ChartOfAccount::where('is_bank_account', true)->value('id')
            ?? ChartOfAccount::where('is_cash_account', true)->value('id');

        if (! $bankAccountId) {
            throw new \RuntimeException('No bank or cash account configured. Please set up your Chart of Accounts.');
        }

        return DB::transaction(function () use ($payment, $invoice, $paidAt, $period, $ar, $bankAccountId) {
            $je = JournalEntry::create([
                'period_id' => $period->id,
                'entry_date' => $paidAt,
                'type' => 'payment',
                'memo' => "Payment — Invoice {$invoice?->number} — ".ucfirst($payment->method ?? ''),
                'functional_currency' => $this->functionalCurrency,
                'source_type' => Payment::class,
                'source_id' => $payment->id,
                'created_by' => Auth::id(),
                'status' => 'draft',
            ]);

            [$exchangeRate, $functionalAmount] = $this->resolveFX(
                $payment->amount,
                $payment->currency ?? $this->functionalCurrency,
                $paidAt
            );

            // Receivable released = invoice carrying value × (amount paid ÷ invoice total).
            // (Comparing the payment to the WHOLE invoice made every partial payment look like an FX loss.)
            $arReleased = $functionalAmount;
            if ($invoice && (float) $invoice->functional_total > 0 && (float) $invoice->total > 0) {
                $arReleased = round((float) $invoice->functional_total * ((float) $payment->amount / (float) $invoice->total), 4);
            }

            $lines = [
                // Dr Bank
                [
                    'journal_entry_id' => $je->id,
                    'account_id' => $bankAccountId,
                    'type' => 'debit',
                    'amount' => $functionalAmount,
                    'foreign_currency' => $payment->currency !== $this->functionalCurrency ? $payment->currency : null,
                    'foreign_amount' => $payment->currency !== $this->functionalCurrency ? (float) $payment->amount : null,
                    'exchange_rate' => $payment->currency !== $this->functionalCurrency ? $exchangeRate : null,
                    'description' => 'Payment received',
                    'client_id' => $invoice?->client_id,
                    'project_id' => $invoice?->project_id,
                    'line_order' => 1,
                ],
                // Cr AR — released at the invoice's carrying value (its own rate), pro-rated for partial payments
                [
                    'journal_entry_id' => $je->id,
                    'account_id' => $ar->id,
                    'type' => 'credit',
                    'amount' => $arReleased,
                    'description' => "Settle AR — Invoice {$invoice?->number}",
                    'client_id' => $invoice?->client_id,
                    'project_id' => $invoice?->project_id,
                    'line_order' => 2,
                ],
            ];

            // IAS 21: FX gain/loss = cash received − receivable released
            $fxDiff = round($functionalAmount - $arReleased, 4);
            if (abs($fxDiff) > 0.005) {
                if ($fxDiff > 0) {
                    $fxAccount = $this->requireAccount('6400', 'Foreign Exchange Gain');
                    $lines[] = [
                        'journal_entry_id' => $je->id,
                        'account_id' => $fxAccount->id,
                        'type' => 'credit',
                        'amount' => abs($fxDiff),
                        'description' => 'FX settlement gain (IAS 21)',
                        'line_order' => 3,
                    ];
                } else {
                    $fxAccount = $this->requireAccount('9200', 'Foreign Exchange Loss');
                    $lines[] = [
                        'journal_entry_id' => $je->id,
                        'account_id' => $fxAccount->id,
                        'type' => 'debit',
                        'amount' => abs($fxDiff),
                        'description' => 'FX settlement loss (IAS 21)',
                        'line_order' => 3,
                    ];
                }
            }

            $this->insertLines($lines);
            $this->post($je);

            $payment->update([
                'journal_entry_id' => $je->id,
                'posting_status' => 'posted',
                'exchange_rate' => $exchangeRate,
            ]);

            return $je->fresh(['lines.account']);
        });
    }

    // ── Expense Posting ────────────────────────────────────────────────────────

    /**
     * Post an expense.
     * Dr Expense Account (8xxx)
     * Cr Accounts Payable / Bank
     */
    public function postExpense(Expense $expense): JournalEntry
    {
        if ($expense->posting_status === 'posted') {
            throw new \RuntimeException("Expense {$expense->id} is already posted.");
        }

        $date = Carbon::parse($expense->incurred_at ?? now());
        $period = $this->requireOpenPeriod($date);

        $expenseAccountId = $expense->expense_account_id
            ?? ChartOfAccount::where('code', '8900')->value('id'); // General & Admin fallback

        $creditAccountId = ChartOfAccount::where('is_ap_account', true)->value('id')
            ?? ChartOfAccount::where('code', '3100')->value('id');

        return DB::transaction(function () use ($expense, $date, $period, $expenseAccountId, $creditAccountId) {
            $je = JournalEntry::create([
                'period_id' => $period->id,
                'entry_date' => $date,
                'type' => 'expense',
                'memo' => 'Expense — '.($expense->description ?? $expense->vendor ?? 'Unnamed'),
                'functional_currency' => $this->functionalCurrency,
                'source_type' => Expense::class,
                'source_id' => $expense->id,
                'created_by' => Auth::id(),
                'status' => 'draft',
            ]);

            [$exchangeRate, $functionalAmount] = $this->resolveFX(
                $expense->amount,
                $expense->currency ?? $this->functionalCurrency,
                $date
            );

            $this->insertLines([
                [
                    'journal_entry_id' => $je->id,
                    'account_id' => $expenseAccountId,
                    'type' => 'debit',
                    'amount' => $functionalAmount,
                    'description' => $expense->description,
                    'project_id' => $expense->project_id,
                    'line_order' => 1,
                ],
                [
                    'journal_entry_id' => $je->id,
                    'account_id' => $creditAccountId,
                    'type' => 'credit',
                    'amount' => $functionalAmount,
                    'description' => "AP — {$expense->vendor}",
                    'project_id' => $expense->project_id,
                    'line_order' => 2,
                ],
            ]);

            $this->post($je);

            $expense->update([
                'journal_entry_id' => $je->id,
                'posting_status' => 'posted',
            ]);

            return $je->fresh(['lines.account']);
        });
    }

    // ── Post / Reverse ─────────────────────────────────────────────────────────

    /**
     * Post a journal entry — makes it immutable and affects ledger balances.
     */
    public function post(JournalEntry $je): JournalEntry
    {
        $errors = $je->validate();
        if (! empty($errors)) {
            throw new \RuntimeException('Cannot post: '.implode('; ', $errors));
        }

        $je->update([
            'status' => 'posted',
            'posted_by' => Auth::id(),
            'posted_at' => now(),
            'posting_date' => $je->entry_date,
        ]);

        return $je;
    }

    /**
     * Reverse a posted journal entry.
     * Creates a new entry with all debits/credits swapped.
     * Links both entries together for audit trail.
     */
    public function reverse(JournalEntry $original, string $memo, ?Carbon $reversalDate = null): JournalEntry
    {
        if (! $original->isPosted()) {
            throw new \RuntimeException('Only posted entries can be reversed.');
        }
        if ($original->is_reversed) {
            throw new \RuntimeException('This entry has already been reversed.');
        }

        $date = $reversalDate ?? now();
        $period = $this->requireOpenPeriod($date);

        return DB::transaction(function () use ($original, $memo, $date, $period) {
            $reversal = JournalEntry::create([
                'period_id' => $period->id,
                'entry_date' => $date,
                'type' => 'reversal',
                'memo' => "REVERSAL: {$original->reference} — {$memo}",
                'functional_currency' => $original->functional_currency,
                'source_type' => $original->source_type,
                'source_id' => $original->source_id,
                'reversed_by' => $original->id,
                'is_reversal' => true,
                'created_by' => Auth::id(),
                'status' => 'draft',
            ]);

            // Swap debits ↔ credits
            $original->lines->each(function ($line) use ($reversal) {
                JournalEntryLine::create([
                    'journal_entry_id' => $reversal->id,
                    'account_id' => $line->account_id,
                    'type' => $line->type === 'debit' ? 'credit' : 'debit',
                    'amount' => $line->amount,
                    'foreign_currency' => $line->foreign_currency,
                    'foreign_amount' => $line->foreign_amount,
                    'exchange_rate' => $line->exchange_rate,
                    'description' => "Reversal: {$line->description}",
                    'project_id' => $line->project_id,
                    'client_id' => $line->client_id,
                    'line_order' => $line->line_order,
                ]);
            });

            $this->post($reversal);

            // Mark original as reversed
            $original->update(['is_reversed' => true]);

            return $reversal;
        });
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    /**
     * Bulk-insert journal lines. Eloquent's insert() builds the column list from the
     * FIRST row only, so rows with different keys (e.g. a VAT line without client_id,
     * or a payment line without foreign-currency fields) fail with "column count does
     * not match value count". Normalise every row to the same columns first.
     */
    private function insertLines(array $lines): void
    {
        $columns = collect($lines)->flatMap(fn ($line) => array_keys($line))->unique()->all();
        $blank = array_fill_keys($columns, null);

        JournalEntryLine::insert(
            array_map(fn ($line) => array_merge($blank, $line), $lines)
        );
    }

    private function requireOpenPeriod(Carbon|\DateTimeInterface|string $date): AccountingPeriod
    {
        $carbon = Carbon::parse($date);
        $period = AccountingPeriod::forDate($carbon);

        if (! $period) {
            // Auto-create the period if it doesn't exist
            AccountingPeriod::createFiscalYear($carbon->year);
            $period = AccountingPeriod::forDate($carbon);
        }

        if (! $period) {
            throw new \RuntimeException("No accounting period found for date {$carbon->toDateString()}.");
        }

        if ($period->isLocked()) {
            throw new \RuntimeException("Period '{$period->name}' is locked. No entries may be posted.");
        }

        return $period;
    }

    private function requireAccount(string $code, string $label): ChartOfAccount
    {
        $account = ChartOfAccount::where('code', $code)->where('is_active', true)->first();

        if (! $account) {
            throw new \RuntimeException(
                "Required account '{$code}' ({$label}) not found. ".
                'Run: php artisan db:seed --class=ChartOfAccountsSeeder'
            );
        }

        return $account;
    }

    /**
     * Resolve exchange rate and functional currency amount.
     * Returns [rate, functional_amount].
     */
    private function resolveFX(float $amount, string $currency, Carbon $date): array
    {
        if ($currency === $this->functionalCurrency) {
            return [1.0, $amount];
        }

        $rate = ExchangeRate::getRate($currency, $this->functionalCurrency, $date);

        if (! $rate) {
            // Never fall back to 1:1 — that would silently book e.g. USD 10,000 as KES 10,000.
            throw new \RuntimeException(
                "No exchange rate for {$currency} → {$this->functionalCurrency} on or before {$date->toDateString()}. "
                .'Add one under Accounting → Exchange Rates before posting this transaction.'
            );
        }

        return [$rate, round($amount * $rate, 4)];
    }
}

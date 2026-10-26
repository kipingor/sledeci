<?php

namespace Sledeci\Accounting\Services\Financing;

use Sledeci\Accounting\Models\Invoice;
use Sledeci\Accounting\Models\Payment;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * InvoiceFinancingService
 *
 * Generates a lender-ready receivables report for invoice financing.
 *
 * Used by fintechs such as Pezesha, Lipa Later, Stanbic, and KCB
 * Invoice Discounting to assess creditworthiness of a business based
 * on its outstanding and historical receivables quality.
 *
 * Report sections:
 *  1. Aged receivables (0-30, 31-60, 61-90, 90+ days)
 *  2. Days Sales Outstanding (DSO) — rolling 90-day
 *  3. Collection efficiency (paid vs billed in last 90 days)
 *  4. Top debtor concentration risk
 *  5. Historical payment behaviour per client
 *  6. Financing eligibility score (0–100)
 */
class InvoiceFinancingService
{
    /**
     * Build the full financing readiness report.
     *
     * @param  string  $functionalCurrency  e.g. 'KES'
     * @return array
     */
    public function buildReport(string $functionalCurrency = 'KES'): array
    {
        $now = Carbon::now();

        // ── Outstanding invoices (not cancelled, not fully paid) ───────────
        $outstanding = Invoice::whereNotIn('status', ['draft', 'cancelled', 'paid'])
            ->with('client:id,name,email,phone')
            ->get();

        // ── Aged buckets ───────────────────────────────────────────────────
        $aged = [
            '0_30'  => ['label' => '0 – 30 days',   'invoices' => [], 'total' => 0],
            '31_60' => ['label' => '31 – 60 days',  'invoices' => [], 'total' => 0],
            '61_90' => ['label' => '61 – 90 days',  'invoices' => [], 'total' => 0],
            '90plus'=> ['label' => '90+ days',       'invoices' => [], 'total' => 0],
        ];

        $totalOutstanding = 0;

        foreach ($outstanding as $inv) {
            $daysPastDue = max(0, (int) $now->diffInDays($inv->due_date, false) * -1);
            $amountDue   = $inv->amountDue();
            $totalOutstanding += $amountDue;

            $entry = [
                'id'           => $inv->id,
                'number'       => $inv->number,
                'client'       => $inv->client?->name,
                'amount_due'   => $amountDue,
                'due_date'     => $inv->due_date?->toDateString(),
                'days_past_due'=> $daysPastDue,
                'currency'     => $inv->currency,
            ];

            if ($daysPastDue <= 30)      { $aged['0_30']['invoices'][]   = $entry; $aged['0_30']['total']   += $amountDue; }
            elseif ($daysPastDue <= 60)  { $aged['31_60']['invoices'][]  = $entry; $aged['31_60']['total']  += $amountDue; }
            elseif ($daysPastDue <= 90)  { $aged['61_90']['invoices'][]  = $entry; $aged['61_90']['total']  += $amountDue; }
            else                         { $aged['90plus']['invoices'][]  = $entry; $aged['90plus']['total'] += $amountDue; }
        }

        // ── DSO (Days Sales Outstanding) — rolling 90-day ────────────────
        $dso = $this->computeDso(90);

        // ── Collection efficiency ─────────────────────────────────────────
        $since90 = $now->copy()->subDays(90);
        $billed90 = Invoice::whereNotIn('status', ['draft', 'cancelled'])
            ->where('issue_date', '>=', $since90)
            ->sum('total');
        $collected90 = Payment::where('paid_at', '>=', $since90)->sum('amount');
        $collectionEfficiency = $billed90 > 0
            ? round(($collected90 / $billed90) * 100, 1)
            : 0;

        // ── Debtor concentration ──────────────────────────────────────────
        $debtorConcentration = $outstanding
            ->groupBy('client_id')
            ->map(function ($invoices, $clientId) use ($totalOutstanding) {
                $client = $invoices->first()->client;
                $total  = $invoices->sum(fn ($i) => $i->amountDue());
                return [
                    'client_id'   => $clientId,
                    'client_name' => $client?->name ?? 'Unknown',
                    'total_due'   => round($total, 2),
                    'pct_of_book' => $totalOutstanding > 0
                        ? round(($total / $totalOutstanding) * 100, 1)
                        : 0,
                    'invoice_count' => $invoices->count(),
                ];
            })
            ->sortByDesc('total_due')
            ->values()
            ->take(10);

        // ── Historical payment behaviour ───────────────────────────────────
        $paymentBehaviour = $this->computePaymentBehaviour();

        // ── Financing score ───────────────────────────────────────────────
        $score = $this->computeFinancingScore(
            dso:                  $dso,
            collectionEfficiency: $collectionEfficiency,
            pctCurrent:           $totalOutstanding > 0 ? ($aged['0_30']['total'] / $totalOutstanding) * 100 : 0,
            pct90Plus:            $totalOutstanding > 0 ? ($aged['90plus']['total'] / $totalOutstanding) * 100 : 0,
        );

        // ── Financing eligibility summary ─────────────────────────────────
        $eligibleReceivables = $aged['0_30']['total'] + $aged['31_60']['total'];
        $advanceRate = $this->advanceRate($score);
        $estimatedFacility = round($eligibleReceivables * $advanceRate, 2);

        return [
            'generated_at'         => $now->toIso8601String(),
            'functional_currency'  => $functionalCurrency,
            'summary' => [
                'total_outstanding'    => round($totalOutstanding, 2),
                'eligible_receivables' => round($eligibleReceivables, 2),
                'dso_days'             => $dso,
                'collection_efficiency'=> $collectionEfficiency,
                'financing_score'      => $score,
                'score_label'          => $this->scoreLabel($score),
                'estimated_facility'   => $estimatedFacility,
                'advance_rate_pct'     => $advanceRate * 100,
            ],
            'aged_receivables'     => $aged,
            'debtor_concentration' => $debtorConcentration,
            'payment_behaviour'    => $paymentBehaviour,
            'recommendations'      => $this->buildRecommendations($score, $dso, $collectionEfficiency, $aged),
        ];
    }

    // ── DSO Calculation ───────────────────────────────────────────────────

    private function computeDso(int $days = 90): float
    {
        $since       = now()->subDays($days);
        $avgReceivables = Invoice::whereNotIn('status', ['draft', 'cancelled'])
            ->where('issue_date', '>=', $since)
            ->avg('total') ?? 0;

        $dailyRevenue = Invoice::whereNotIn('status', ['draft', 'cancelled'])
            ->where('issue_date', '>=', $since)
            ->sum('total') / $days;

        if ($dailyRevenue <= 0) return 0;

        return round($avgReceivables / $dailyRevenue, 1);
    }

    // ── Payment behaviour per client ─────────────────────────────────────

    private function computePaymentBehaviour(): array
    {
        return DB::table('invoices as i')
            ->join('payments as p', 'p.invoice_id', '=', 'i.id')
            ->join('users as u', 'u.id', '=', 'i.client_id')
            ->whereNotIn('i.status', ['draft', 'cancelled'])
            ->whereNotNull('i.due_date')
            ->selectRaw("
                i.client_id,
                u.name as client_name,
                COUNT(DISTINCT i.id) as invoice_count,
                AVG(DATEDIFF(p.paid_at, i.due_date)) as avg_days_to_pay,
                SUM(p.amount) as total_paid,
                MAX(DATEDIFF(p.paid_at, i.due_date)) as worst_delay_days
            ")
            ->groupBy('i.client_id', 'u.name')
            ->orderByDesc('total_paid')
            ->limit(20)
            ->get()
            ->map(fn ($row) => [
                'client_id'         => $row->client_id,
                'client_name'       => $row->client_name,
                'invoice_count'     => (int)   $row->invoice_count,
                'avg_days_to_pay'   => round((float) $row->avg_days_to_pay, 1),
                'total_paid'        => round((float) $row->total_paid, 2),
                'worst_delay_days'  => (int)   $row->worst_delay_days,
                'pays_on_time'      => (float) $row->avg_days_to_pay <= 5,
            ])
            ->toArray();
    }

    // ── Financing score ───────────────────────────────────────────────────

    private function computeFinancingScore(
        float $dso,
        float $collectionEfficiency,
        float $pctCurrent,
        float $pct90Plus
    ): int {
        $score = 0;

        // DSO scoring (max 30 points): lower DSO = better
        $score += match (true) {
            $dso <= 30  => 30,
            $dso <= 45  => 25,
            $dso <= 60  => 18,
            $dso <= 90  => 10,
            default     => 3,
        };

        // Collection efficiency (max 30 points)
        $score += match (true) {
            $collectionEfficiency >= 95 => 30,
            $collectionEfficiency >= 85 => 24,
            $collectionEfficiency >= 70 => 16,
            $collectionEfficiency >= 50 => 8,
            default                     => 2,
        };

        // % current (0-30d) receivables (max 25 points)
        $score += match (true) {
            $pctCurrent >= 80 => 25,
            $pctCurrent >= 60 => 20,
            $pctCurrent >= 40 => 12,
            $pctCurrent >= 20 => 6,
            default           => 2,
        };

        // 90+ day overdue penalty (max 15 points deduction)
        $score -= match (true) {
            $pct90Plus <= 5  => 0,
            $pct90Plus <= 15 => 5,
            $pct90Plus <= 30 => 10,
            default          => 15,
        };

        return max(0, min(100, $score));
    }

    private function scoreLabel(int $score): string
    {
        return match (true) {
            $score >= 80 => 'Excellent',
            $score >= 65 => 'Good',
            $score >= 50 => 'Fair',
            $score >= 35 => 'Poor',
            default      => 'High Risk',
        };
    }

    private function advanceRate(int $score): float
    {
        return match (true) {
            $score >= 80 => 0.85,
            $score >= 65 => 0.75,
            $score >= 50 => 0.65,
            $score >= 35 => 0.50,
            default      => 0.40,
        };
    }

    private function buildRecommendations(int $score, float $dso, float $efficiency, array $aged): array
    {
        $recs = [];

        if ($dso > 60) {
            $recs[] = 'Your DSO of ' . $dso . ' days is above optimal. Send payment reminders earlier — at 7 and 14 days before due date.';
        }
        if ($efficiency < 80) {
            $recs[] = 'Collection efficiency is ' . $efficiency . '%. Enable M-Pesa payment links on invoices to reduce friction.';
        }
        if ($aged['90plus']['total'] > 0) {
            $recs[] = 'You have KES ' . number_format($aged['90plus']['total'], 0) . ' in 90+ day overdue invoices. Write these off or pursue formally to clean your book.';
        }
        if ($score < 65) {
            $recs[] = 'Consider shortening payment terms to 14 days for new clients and offering early-payment discounts.';
        }

        return $recs;
    }
}
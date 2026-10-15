<?php

namespace App\Services;

use App\Models\Expense;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\PurchaseOrder;
use App\Services\Forex\ForexService;
use Illuminate\Support\Facades\DB;

/**
 * CashFlowForecastService
 *
 * Builds a 30/60/90-day cash-flow forecast from real data:
 *
 *  INFLOWS  — issued/overdue invoices whose due date falls in each period
 *           + historically-adjusted collection rate (if < 100%)
 *
 *  OUTFLOWS — outstanding purchase orders + recurring monthly expenses
 *           projected forward
 *
 * All amounts are normalised to the functional currency (KES by default).
 */
class CashFlowForecastService
{
    public function __construct(private ForexService $forex) {}

    /**
     * Build the full forecast payload consumed by the dashboard widget.
     *
     * @param  string  $functionalCurrency
     * @return array{periods, opening_balance, currency, overdue_receivables, overdue_payables}
     */
    public function build(string $functionalCurrency = 'KES'): array
    {
        $today = now()->startOfDay();

        // ── Opening balance: sum of all received payments minus expenses ──────
        $totalReceived  = Payment::sum('amount');
        $totalExpensed  = Expense::sum('amount');
        $openingBalance = max(0, (float) $totalReceived - (float) $totalExpensed);

        // ── Historical collection rate ─────────────────────────────────────────
        // What % of issued invoices actually get paid (last 90 days)
        $issued  = Invoice::whereIn('status', ['issued', 'paid', 'overdue'])
            ->where('issue_date', '>=', $today->copy()->subDays(90))
            ->sum('total');
        $paid    = Payment::where('paid_at', '>=', $today->copy()->subDays(90))
            ->sum('amount');
        $collectRate = $issued > 0 ? min(1.0, (float) $paid / (float) $issued) : 0.8;

        // ── Overdue (excluded from forecast, shown as alert) ──────────────────
        $overdueReceivables = Invoice::where('status', 'overdue')->sum('total');
        $overduePayables    = PurchaseOrder::where('status', 'approved')
            ->whereDate('expected_delivery', '<', $today)
            ->sum('total');

        // ── Build three periods ───────────────────────────────────────────────
        $periods = [];
        $windowStarts = [0, 0, 0];
        $windowEnds   = [30, 60, 90];
        $labels       = ['Next 30 days', 'Next 60 days', 'Next 90 days'];

        foreach ([30, 60, 90] as $i => $days) {
            $start = $i === 0 ? $today : $today->copy()->addDays($i === 1 ? 31 : 61);
            $end   = $today->copy()->addDays($days);

            // Inflows: invoices due in this window
            $invoicesDue = Invoice::whereIn('status', ['issued', 'overdue'])
                ->whereBetween('due_date', [$start, $end])
                ->get();

            $inflows = $invoicesDue->sum(function (Invoice $inv) use ($functionalCurrency) {
                $due  = $inv->amountDue();
                if ($inv->currency === $functionalCurrency) return $due;
                return $this->forex->convert($due, $inv->currency, $functionalCurrency);
            });

            // Apply collection rate adjustment
            $inflows = round($inflows * $collectRate, 2);

            // Outflows: POs expected in this window + recurring expenses
            $poOutflows = PurchaseOrder::where('status', 'approved')
                ->whereBetween('expected_delivery', [$start, $end])
                ->sum('total');

            // Recurring expenses: average monthly × months in window
            $avgMonthlyExpense = Expense::where('incurred_at', '>=', $today->copy()->subMonths(3))
                ->avg('amount') ?? 0;
            $monthsInWindow    = $days / 30;
            $expenseOutflows   = round((float) $avgMonthlyExpense * $monthsInWindow, 2);

            $outflows = round((float) $poOutflows + $expenseOutflows, 2);
            $net      = round($inflows - $outflows, 2);

            $periods[] = [
                'label'    => $labels[$i],
                'inflows'  => $inflows,
                'outflows' => $outflows,
                'net'      => $net,
            ];
        }

        return [
            'periods'             => $periods,
            'opening_balance'     => round($openingBalance, 2),
            'currency'            => $functionalCurrency,
            'overdue_receivables' => round((float) $overdueReceivables, 2),
            'overdue_payables'    => round((float) $overduePayables, 2),
            'collection_rate_pct' => round($collectRate * 100, 1),
        ];
    }
}

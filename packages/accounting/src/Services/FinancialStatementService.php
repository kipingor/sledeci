<?php

namespace Sledeci\Accounting\Services;

use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Sledeci\Accounting\Models\ChartOfAccount;

/**
 * FinancialStatementService
 *
 * Generates the four primary IFRS financial statements:
 *
 *   1. Trial Balance — all account balances at a point in time
 *   2. Statement of Profit or Loss (P&L) — revenue and expenses for a period
 *   3. Statement of Financial Position (Balance Sheet) — assets, liabilities, equity
 *   4. Statement of Cash Flows — operating, investing, financing cash movements
 *
 * All amounts are in the functional currency unless otherwise noted.
 * All queries operate only on POSTED journal entries.
 */
class FinancialStatementService
{
    // ── Trial Balance ─────────────────────────────────────────────────────────

    /**
     * Generate a trial balance as of a given date.
     * Shows every account with a non-zero balance.
     *
     * @return array{
     *     accounts: Collection,
     *     total_debits: float,
     *     total_credits: float,
     *     is_balanced: bool,
     *     as_of: string
     * }
     */
    public function trialBalance(Carbon $asOf, bool $includeZero = false): array
    {
        $balances = DB::table('journal_entry_lines as l')
            ->join('journal_entries as je', 'je.id', '=', 'l.journal_entry_id')
            ->join('chart_of_accounts as a', 'a.id', '=', 'l.account_id')
            ->where('je.status', 'posted')
            ->whereDate('je.entry_date', '<=', $asOf->toDateString())
            ->select([
                'a.id', 'a.code', 'a.name', 'a.type', 'a.normal_balance', 'a.sort_order',
                DB::raw('SUM(CASE WHEN l.type = "debit"  THEN l.amount ELSE 0 END) as total_debits'),
                DB::raw('SUM(CASE WHEN l.type = "credit" THEN l.amount ELSE 0 END) as total_credits'),
            ])
            ->groupBy('a.id', 'a.code', 'a.name', 'a.type', 'a.normal_balance', 'a.sort_order')
            ->orderBy('a.sort_order')
            ->orderBy('a.code')
            ->get()
            ->map(function ($row) {
                $balance = $row->normal_balance === 'debit'
                    ? $row->total_debits - $row->total_credits
                    : $row->total_credits - $row->total_debits;

                return [
                    'id' => $row->id,
                    'code' => $row->code,
                    'name' => $row->name,
                    'type' => $row->type,
                    'normal_balance' => $row->normal_balance,
                    'debit' => round((float) $row->total_debits, 2),
                    'credit' => round((float) $row->total_credits, 2),
                    'balance' => round($balance, 2),
                ];
            });

        if (! $includeZero) {
            $balances = $balances->filter(fn ($a) => abs($a['balance']) >= 0.005);
        }

        $totalDebits = round($balances->sum('debit'), 2);
        $totalCredits = round($balances->sum('credit'), 2);

        return [
            'accounts' => $balances->values(),
            'total_debits' => $totalDebits,
            'total_credits' => $totalCredits,
            'is_balanced' => abs($totalDebits - $totalCredits) < 0.01,
            'as_of' => $asOf->toDateString(),
        ];
    }

    // ── Statement of Profit or Loss ───────────────────────────────────────────

    /**
     * Generate P&L for a date range.
     *
     * Structure (IAS 1 - Nature of Expense format):
     *   Revenue
     *   − Cost of Sales
     *   = Gross Profit
     *   − Operating Expenses
     *   = Operating Profit (EBIT)
     *   + Other Income
     *   − Other Expenses
     *   = Profit Before Tax
     *   − Income Tax
     *   = Net Profit for the Period
     */
    public function profitAndLoss(Carbon $from, Carbon $to): array
    {
        $balances = $this->getPLBalances($from, $to);

        $revenue = $this->sumByType($balances, ['revenue']);
        $cogs = $this->sumByType($balances, ['cogs']);
        $grossProfit = $revenue - $cogs;

        $operatingExpenses = $this->sumByType($balances, ['expense']);
        $ebit = $grossProfit - $operatingExpenses;

        $otherIncome = $this->sumByType($balances, ['other_income']);
        $otherExpense = $this->sumByType($balances, ['other_expense']) - $this->getTaxExpense($balances);
        $pbt = $ebit + $otherIncome - $otherExpense;

        $taxExpense = $this->getTaxExpense($balances);
        $netProfit = $pbt - $taxExpense;

        return [
            'period' => ['from' => $from->toDateString(), 'to' => $to->toDateString()],
            'revenue' => $this->getLineItems($balances, ['revenue']),
            'revenue_total' => round($revenue, 2),
            'cogs' => $this->getLineItems($balances, ['cogs']),
            'cogs_total' => round($cogs, 2),
            'gross_profit' => round($grossProfit, 2),
            'gross_margin_pct' => $revenue > 0 ? round($grossProfit / $revenue * 100, 1) : 0,
            'operating_expenses' => $this->getLineItems($balances, ['expense']),
            'opex_total' => round($operatingExpenses, 2),
            'ebit' => round($ebit, 2),
            'ebit_margin_pct' => $revenue > 0 ? round($ebit / $revenue * 100, 1) : 0,
            'other_income' => $this->getLineItems($balances, ['other_income']),
            'other_expense' => $this->getLineItems($balances, ['other_expense'], excludeTax: true),
            'profit_before_tax' => round($pbt, 2),
            'tax_expense' => round($taxExpense, 2),
            'net_profit' => round($netProfit, 2),
            'net_margin_pct' => $revenue > 0 ? round($netProfit / $revenue * 100, 1) : 0,
        ];
    }

    // ── Statement of Financial Position ──────────────────────────────────────

    /**
     * Generate Balance Sheet as of a given date (IAS 1).
     *
     * Assets = Liabilities + Equity
     */
    public function balanceSheet(Carbon $asOf): array
    {
        $trial = $this->trialBalance($asOf, true);
        $accts = collect($trial['accounts'])->keyBy('code');

        $currentAssets = $this->getBSSection($accts, 'asset', ['cash', 'bank', 'accounts_receivable', 'inventory', 'prepaid', 'other_current_asset'], $asOf);
        $nonCurrentAssets = $this->getBSSection($accts, 'asset', ['fixed_asset', 'accumulated_depreciation', 'intangible', 'other_non_current_asset'], $asOf);

        $totalAssets = $currentAssets['total'] + $nonCurrentAssets['total'];

        $currentLiabilities = $this->getBSSection($accts, 'liability', ['accounts_payable', 'accrued_liability', 'deferred_revenue', 'tax_payable', 'short_term_debt'], $asOf);
        $nonCurrentLiabilities = $this->getBSSection($accts, 'liability', ['long_term_debt', 'other_liability'], $asOf);

        $totalLiabilities = $currentLiabilities['total'] + $nonCurrentLiabilities['total'];

        $equity = $this->getBSSection($accts, 'equity', ['share_capital', 'retained_earnings', 'current_earnings', 'other_equity'], $asOf);

        // P&L for the current fiscal year flows into equity as current earnings
        $currentFY = $this->getCurrentFYDateRange($asOf);
        $plData = $this->profitAndLoss($currentFY['from'], $currentFY['to']);
        $currentEarnings = $plData['net_profit'];

        $totalEquity = $equity['total'] + $currentEarnings;

        return [
            'as_of' => $asOf->toDateString(),
            'current_assets' => $currentAssets,
            'non_current_assets' => $nonCurrentAssets,
            'total_assets' => round($totalAssets, 2),
            'current_liabilities' => $currentLiabilities,
            'non_current_liabilities' => $nonCurrentLiabilities,
            'total_liabilities' => round($totalLiabilities, 2),
            'equity' => $equity,
            'current_year_earnings' => round($currentEarnings, 2),
            'total_equity' => round($totalEquity, 2),
            'total_liabilities_equity' => round($totalLiabilities + $totalEquity, 2),
            'is_balanced' => abs($totalAssets - ($totalLiabilities + $totalEquity)) < 0.05,
        ];
    }

    // ── Statement of Cash Flows (Indirect method, IAS 7) ─────────────────────

    /**
     * Generate Cash Flow Statement using the indirect method (IAS 7).
     *
     * Reconciles net profit to cash from operations by adjusting for:
     *   - Non-cash items (depreciation, amortisation)
     *   - Working capital changes (AR, AP, inventory)
     */
    public function cashFlows(Carbon $from, Carbon $to): array
    {
        $pl = $this->profitAndLoss($from, $to);

        // Opening and closing balances of working capital accounts
        $arOpen = $this->accountBalance('1100', $from->copy()->subDay());
        $arClose = $this->accountBalance('1100', $to);
        $apOpen = $this->accountBalance('3100', $from->copy()->subDay());
        $apClose = $this->accountBalance('3100', $to);

        // Non-cash adjustments
        $depreciation = $this->plAccountBalance('8600', $from, $to);
        $amortisation = $this->plAccountBalance('8610', $from, $to);
        $badDebt = $this->plAccountBalance('8700', $from, $to);

        // Working capital changes
        $deltaAR = $arOpen - $arClose;  // Increase in AR = cash used
        $deltaAP = $apClose - $apOpen;  // Increase in AP = cash generated

        $cashFromOperations = $pl['net_profit']
            + $depreciation
            + $amortisation
            + $badDebt
            + $deltaAR
            + $deltaAP;

        // Cash from investing (capital expenditure)
        $capex = $this->plAccountDebitBalance(['2100', '2200'], $from, $to);

        // Cash at opening and closing
        $cashAccounts = ChartOfAccount::where('is_cash_account', true)->orWhere('is_bank_account', true)->pluck('code');
        $openingCash = $cashAccounts->sum(fn ($code) => $this->accountBalance($code, $from->copy()->subDay()));
        $closingCash = $cashAccounts->sum(fn ($code) => $this->accountBalance($code, $to));

        return [
            'period' => ['from' => $from->toDateString(), 'to' => $to->toDateString()],
            'net_profit' => round($pl['net_profit'], 2),
            'adjustments' => [
                'depreciation' => round($depreciation, 2),
                'amortisation' => round($amortisation, 2),
                'bad_debt_expense' => round($badDebt, 2),
                'change_in_receivables' => round($deltaAR, 2),
                'change_in_payables' => round($deltaAP, 2),
            ],
            'cash_from_operations' => round($cashFromOperations, 2),
            'cash_from_investing' => round(-$capex, 2),
            'cash_from_financing' => 0, // Extend with loan/equity movements
            'net_change_in_cash' => round($cashFromOperations - $capex, 2),
            'opening_cash_balance' => round($openingCash, 2),
            'closing_cash_balance' => round($closingCash, 2),
        ];
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    private function getPLBalances(Carbon $from, Carbon $to): Collection
    {
        return DB::table('journal_entry_lines as l')
            ->join('journal_entries as je', 'je.id', '=', 'l.journal_entry_id')
            ->join('chart_of_accounts as a', 'a.id', '=', 'l.account_id')
            ->where('je.status', 'posted')
            ->whereDate('je.entry_date', '>=', $from->toDateString())
            ->whereDate('je.entry_date', '<=', $to->toDateString())
            ->whereIn('a.type', ['revenue', 'expense', 'cogs', 'other_income', 'other_expense'])
            ->select([
                'a.id', 'a.code', 'a.name', 'a.type', 'a.sub_type', 'a.normal_balance', 'a.sort_order',
                DB::raw('SUM(CASE WHEN l.type = "debit"  THEN l.amount ELSE 0 END) as total_debits'),
                DB::raw('SUM(CASE WHEN l.type = "credit" THEN l.amount ELSE 0 END) as total_credits'),
            ])
            ->groupBy('a.id', 'a.code', 'a.name', 'a.type', 'a.sub_type', 'a.normal_balance', 'a.sort_order')
            ->orderBy('a.sort_order')
            ->get()
            ->map(function ($row) {
                $balance = $row->normal_balance === 'debit'
                    ? (float) $row->total_debits - (float) $row->total_credits
                    : (float) $row->total_credits - (float) $row->total_debits;

                return (object) array_merge((array) $row, ['balance' => round($balance, 2)]);
            });
    }

    private function sumByType(Collection $balances, array $types): float
    {
        return $balances->whereIn('type', $types)->sum('balance');
    }

    private function getTaxExpense(Collection $balances): float
    {
        return $balances->where('sub_type', 'tax_expense')->sum('balance');
    }

    private function getLineItems(Collection $balances, array $types, bool $excludeTax = false): array
    {
        $items = $balances->whereIn('type', $types);
        if ($excludeTax) {
            $items = $items->where('sub_type', '!=', 'tax_expense');
        }

        return $items->map(fn ($a) => [
            'code' => $a->code,
            'name' => $a->name,
            'balance' => $a->balance,
        ])->values()->toArray();
    }

    private function getBSSection(Collection $accts, string $type, array $subTypes, Carbon $asOf): array
    {
        $items = $accts->where('type', $type)
            ->whereIn('sub_type', $subTypes)
            ->filter(fn ($a) => abs($a['balance']) >= 0.005)
            ->map(fn ($a) => ['code' => $a['code'], 'name' => $a['name'], 'balance' => $a['balance']])
            ->values();

        return [
            'items' => $items->toArray(),
            'total' => round($items->sum('balance'), 2),
        ];
    }

    private function accountBalance(string $code, Carbon $asOf): float
    {
        $account = ChartOfAccount::where('code', $code)->first();

        return $account ? $account->balance($asOf) : 0.0;
    }

    private function plAccountBalance(string $code, Carbon $from, Carbon $to): float
    {
        $balances = $this->getPLBalances($from, $to);

        return $balances->where('code', $code)->sum('balance');
    }

    private function plAccountDebitBalance(array $codes, Carbon $from, Carbon $to): float
    {
        return DB::table('journal_entry_lines as l')
            ->join('journal_entries as je', 'je.id', '=', 'l.journal_entry_id')
            ->join('chart_of_accounts as a', 'a.id', '=', 'l.account_id')
            ->where('je.status', 'posted')
            ->whereDate('je.entry_date', '>=', $from->toDateString())
            ->whereDate('je.entry_date', '<=', $to->toDateString())
            ->whereIn('a.code', $codes)
            ->where('l.type', 'debit')
            ->sum('l.amount');
    }

    private function getCurrentFYDateRange(Carbon $asOf): array
    {
        // Assumes calendar year fiscal year — adjust for non-calendar FY if needed
        return [
            'from' => Carbon::create($asOf->year, 1, 1)->startOfDay(),
            'to' => $asOf->copy()->endOfDay(),
        ];
    }
}

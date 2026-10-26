<?php

namespace Sledeci\Accounting\Http\Controllers;

use Sledeci\Core\Http\Controller;
use Sledeci\Accounting\Models\AccountingPeriod;
use Sledeci\Accounting\Models\ExchangeRate;
use Sledeci\Accounting\Models\JournalEntry;
use Sledeci\Accounting\Services\FinancialStatementService;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class FinancialReportsController extends Controller
{
    public function __construct(protected FinancialStatementService $fs)
    {
    }

    public function trialBalance(Request $request): Response
    {
        $asOf = Carbon::parse($request->as_of ?? now());

        return Inertia::render('reports/trial-balance', [
            'data'    => $this->fs->trialBalance($asOf),
            'as_of'   => $asOf->toDateString(),
            'periods' => $this->periodOptions(),
        ]);
    }

    public function profitAndLoss(Request $request): Response
    {
        $from = Carbon::parse($request->from ?? now()->startOfYear());
        $to   = Carbon::parse($request->to   ?? now());

        return Inertia::render('reports/profit-loss', [
            'data'    => $this->fs->profitAndLoss($from, $to),
            'from'    => $from->toDateString(),
            'to'      => $to->toDateString(),
            'periods' => $this->periodOptions(),
        ]);
    }

    public function balanceSheet(Request $request): Response
    {
        $asOf = Carbon::parse($request->as_of ?? now());

        return Inertia::render('reports/balance-sheet', [
            'data'  => $this->fs->balanceSheet($asOf),
            'as_of' => $asOf->toDateString(),
        ]);
    }

    public function cashFlows(Request $request): Response
    {
        $from = Carbon::parse($request->from ?? now()->startOfYear());
        $to   = Carbon::parse($request->to   ?? now());

        return Inertia::render('reports/cash-flows', [
            'data' => $this->fs->cashFlows($from, $to),
            'from' => $from->toDateString(),
            'to'   => $to->toDateString(),
        ]);
    }

    public function exchangeRates(Request $request): Response
    {
        $rates = ExchangeRate::with('enteredBy')
            ->orderByDesc('rate_date')
            ->paginate(30);

        return Inertia::render('accounting/exchange-rates', [
            'rates' => $rates,
        ]);
    }

    public function storeExchangeRate(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'from_currency' => 'required|string|size:3',
            'to_currency'   => 'required|string|size:3',
            'rate'          => 'required|numeric|min:0.0001',
            'rate_type'     => 'required|in:spot,average,closing',
            'rate_date'     => 'required|date',
            'source'        => 'nullable|string|max:50',
        ]);

        ExchangeRate::updateOrCreate(
            [
                'from_currency' => strtoupper($data['from_currency']),
                'to_currency'   => strtoupper($data['to_currency']),
                'rate_date'     => $data['rate_date'],
                'rate_type'     => $data['rate_type'],
            ],
            array_merge($data, ['entered_by' => Auth::id()])
        );

        return back()->with('success', 'Exchange rate saved.');
    }

    public function periods(): Response
    {
        return Inertia::render('accounting/periods', [
            'periods' => AccountingPeriod::orderByDesc('starts_on')->get(),
        ]);
    }

    public function createPeriods(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'fiscal_year'  => 'required|integer|min:2020|max:2099',
            'start_month'  => 'required|integer|min:1|max:12',
        ]);

        AccountingPeriod::createFiscalYear($data['fiscal_year'], $data['start_month']);

        return back()->with('success', "12 monthly periods created for fiscal year {$data['fiscal_year']}.");
    }

    public function closePeriod(Request $request, AccountingPeriod $period): RedirectResponse
    {
        if ($period->isClosed()) {
            return back()->with('error', 'Period is already closed.');
        }

        if (JournalEntry::where('period_id', $period->id)->where('status', 'draft')->exists()) {
            return back()->with('error', 'Period has unposted draft entries. Post or void them first.');
        }

        $period->update([
            'status'    => $request->lock ? 'locked' : 'closed',
            'closed_at' => now(),
            'closed_by' => Auth::id(),
        ]);

        return back()->with('success', "Period '{$period->name}' " . ($request->lock ? 'locked' : 'closed') . '.');
    }

    private function periodOptions(): array
    {
        return AccountingPeriod::orderByDesc('starts_on')
            ->limit(24)
            ->get(['id', 'name', 'starts_on', 'ends_on', 'status'])
            ->toArray();
    }
}

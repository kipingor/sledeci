<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Sledeci\Accounting\Services\CashFlowForecastService;
use Sledeci\Accounting\Services\Forex\ForexService;
use Sledeci\Accounting\Models\Payment;
use App\Models\CompanySetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

/**
 * FinancialDashboardController
 *
 * Serves the "Financial Pulse" widgets on the main dashboard:
 *  - 30/60/90-day cash flow forecast
 *  - Multi-currency exposure summary
 *  - Mobile money collection breakdown (last 30 days)
 *
 * Mirrors the existing /api/v1/analytics/dashboard pattern (axios + JSON)
 * so it slots into the existing Dashboard component without an Inertia
 * round-trip.
 *
 * Route: GET /api/v1/dashboard/financial-pulse
 */
class FinancialDashboardController extends Controller
{
    public function __construct(
        private CashFlowForecastService $forecast,
        private ForexService            $forex,
    ) {}

    public function index(Request $request)
    {
        $functional = config('company.functional_currency', 'KES');

        $data = Cache::remember('dashboard_financial_pulse_' . $functional, 300, function () use ($functional) {
            return [
                'forecast'        => $this->forecast->build($functional),
                'multi_currency'  => $this->forex->buildMultiCurrencySummary($functional),
                'mobile_money'    => $this->mobileMoneyBreakdown(),
                'functional_currency' => $functional,
            ];
        });

        return response()->json(['success' => true, 'data' => $data]);
    }

    /**
     * Breakdown of mobile money collections over the last 30 days,
     * with reconciliation health.
     */
    private function mobileMoneyBreakdown(): array
    {
        $since = now()->subDays(30);

        $byChannel = Payment::selectRaw('channel, COUNT(*) as count, SUM(amount) as total')
            ->whereIn('channel', ['mpesa', 'airtel_money', 'mtn_momo'])
            ->where('paid_at', '>=', $since)
            ->groupBy('channel')
            ->get()
            ->map(fn ($row) => [
                'channel' => $row->channel,
                'count'   => (int) $row->count,
                'total'   => (float) $row->total,
            ]);

        $unmatchedCount = Payment::whereIn('channel', ['mpesa', 'airtel_money', 'mtn_momo'])
            ->where('reconciliation_status', 'unmatched')
            ->count();

        return [
            'by_channel'      => $byChannel,
            'unmatched_count' => $unmatchedCount,
            'period_days'     => 30,
        ];
    }
}

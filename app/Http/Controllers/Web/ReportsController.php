<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use App\Models\Opportunity;
use App\Models\Project;
use App\Models\Task;
use App\Enums\LeadStatus;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ReportsController extends Controller
{
    public function index(Request $request)
    {
        $period = $request->input('period', '30');   // days
        $from   = Carbon::now()->subDays((int) $period)->startOfDay();
        $to     = Carbon::now()->endOfDay();

        return Inertia::render('reports/index', [
            'period'        => $period,
            'leadSummary'   => $this->leadSummary($from, $to),
            'leadsByStatus' => $this->leadsByStatus(),
            'leadsBySource' => $this->leadsBySource($from, $to),
            'leadsOverTime' => $this->leadsOverTime($from, $to),
            'opportunitySummary' => $this->opportunitySummary($from, $to),
            'opportunitiesByStage' => $this->opportunitiesByStage(),
            'projectSummary'  => $this->projectSummary(),
            'projectsByStatus' => $this->projectsByStatus(),
            'conversionFunnel' => $this->conversionFunnel(),
        ]);
    }

    // ── Leads ──────────────────────────────────────────────────────────────

    private function leadSummary(Carbon $from, Carbon $to): array
    {
        $total   = Lead::count();
        $new     = Lead::whereBetween('created_at', [$from, $to])->count();
        $won     = Lead::where('status', LeadStatus::WON)->count();
        $lost    = Lead::where('status', LeadStatus::LOST)->count();
        $closed  = $won + $lost;

        return [
            'total'           => $total,
            'new_in_period'   => $new,
            'won'             => $won,
            'lost'            => $lost,
            'conversion_rate' => $closed > 0 ? round(($won / $closed) * 100, 1) : 0,
            'avg_value'       => Lead::where('status', LeadStatus::WON)->avg('estimated_value') ?? 0,
            'pipeline_value'  => Lead::whereNotIn('status', [LeadStatus::WON, LeadStatus::LOST])->sum('estimated_value') ?? 0,
        ];
    }

    private function leadsByStatus(): array
    {
        return Lead::select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->get()
            ->map(fn($r) => [
                'status' => $r->status instanceof LeadStatus ? $r->status->value : $r->status,
                'label'  => $r->status instanceof LeadStatus ? $r->status->label() : ucfirst($r->status),
                'count'  => $r->count,
                'color'  => $r->status instanceof LeadStatus ? $r->status->color() : '#6b7280',
            ])
            ->toArray();
    }

    private function leadsBySource(Carbon $from, Carbon $to): array
    {
        // `source` is stored inside the `metadata` JSON column, not as a flat column.
        return Lead::select(
                DB::raw("JSON_UNQUOTE(JSON_EXTRACT(metadata, '\$.source')) as source"),
                DB::raw('count(*) as count')
            )
            ->whereBetween('created_at', [$from, $to])
            ->whereNotNull('metadata')
            ->whereRaw("JSON_UNQUOTE(JSON_EXTRACT(metadata, '\$.source')) IS NOT NULL")
            ->whereRaw("JSON_UNQUOTE(JSON_EXTRACT(metadata, '\$.source')) != 'null'")
            ->groupBy(DB::raw("JSON_UNQUOTE(JSON_EXTRACT(metadata, '\$.source'))"))
            ->orderByDesc('count')
            ->limit(8)
            ->get()
            ->map(fn($r) => ['source' => $r->source ?? 'Unknown', 'count' => $r->count])
            ->toArray();
    }

    private function leadsOverTime(Carbon $from, Carbon $to): array
    {
        $days = $from->diffInDays($to);
        $format = $days <= 31 ? '%Y-%m-%d' : '%Y-%u';  // daily or weekly

        return Lead::select(
                DB::raw("DATE_FORMAT(created_at, '{$format}') as period"),
                DB::raw('count(*) as count')
            )
            ->whereBetween('created_at', [$from, $to])
            ->groupBy('period')
            ->orderBy('period')
            ->get()
            ->map(fn($r) => ['period' => $r->period, 'count' => $r->count])
            ->toArray();
    }

    // ── Opportunities ──────────────────────────────────────────────────────

    private function opportunitySummary(Carbon $from, Carbon $to): array
    {
        $total  = Opportunity::count();
        $new    = Opportunity::whereBetween('created_at', [$from, $to])->count();
        $won    = Opportunity::where('stage', 'closed_won')->count();
        $lost   = Opportunity::where('stage', 'closed_lost')->count();
        $closed = $won + $lost;

        return [
            'total'           => $total,
            'new_in_period'   => $new,
            'won'             => $won,
            'lost'            => $lost,
            'conversion_rate' => $closed > 0 ? round(($won / $closed) * 100, 1) : 0,
            'total_value'     => Opportunity::sum('estimated_value') ?? 0,
            'won_value'       => Opportunity::where('stage', 'closed_won')->sum('estimated_value') ?? 0,
        ];
    }

    private function opportunitiesByStage(): array
    {
        return Opportunity::select('stage', DB::raw('count(*) as count'), DB::raw('sum(estimated_value) as value'))
            ->groupBy('stage')
            ->get()
            ->map(fn($r) => [
                'stage' => $r->stage instanceof \App\Enums\OpportunityStage ? $r->stage->value : $r->stage,
                'label' => $r->stage instanceof \App\Enums\OpportunityStage ? $r->stage->label() : ucfirst(str_replace('_', ' ', $r->stage)),
                'count' => $r->count,
                'value' => round($r->value ?? 0, 2),
            ])
            ->toArray();
    }

    // ── Projects ───────────────────────────────────────────────────────────

    private function projectSummary(): array
    {
        return [
            'total'     => Project::count(),
            'active'    => Project::where('status', 'active')->count(),
            'completed' => Project::where('status', 'completed')->count(),
            'on_hold'   => Project::where('status', 'on_hold')->count(),
            'overdue'   => Project::where('status', 'active')
                ->whereNotNull('end_date')
                ->where('end_date', '<', now())
                ->count(),
            'total_budget' => Project::sum('budget') ?? 0,
        ];
    }

    private function projectsByStatus(): array
    {
        return Project::select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->get()
            ->map(fn($r) => ['status' => $r->status, 'count' => $r->count])
            ->toArray();
    }

    // ── Funnel ─────────────────────────────────────────────────────────────

    private function conversionFunnel(): array
    {
        $total        = Lead::count();
        $qualified    = Lead::where('status', LeadStatus::QUALIFIED)->count();
        $opportunities = Opportunity::count();
        $won          = Lead::where('status', LeadStatus::WON)->count();

        return [
            ['label' => 'Total Leads',    'count' => $total],
            ['label' => 'Qualified',       'count' => $qualified],
            ['label' => 'Opportunities',   'count' => $opportunities],
            ['label' => 'Closed Won',      'count' => $won],
        ];
    }
}
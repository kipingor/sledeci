<?php

namespace App\Http\Controllers\Tenant\CRM;

use App\Http\Controllers\Controller;
use App\Http\Requests\CRM\StoreDealRequest;
use App\Http\Requests\CRM\UpdateDealRequest;
use App\Models\Company;
use App\Models\Contact;
use App\Models\Deal;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DealController extends Controller
{
    public function index(Request $request): Response
    {
        $view = $request->input('view', 'pipeline');

        $query = Deal::with(['contact', 'company', 'owner'])
            ->when($request->input('search'), fn ($q, $s) =>
                $q->where('title', 'ilike', "%{$s}%")
            )
            ->when($request->input('owner_id'), fn ($q, $id) => $q->where('owner_id', $id))
            ->when($request->input('stage'), fn ($q, $stage) => $q->where('stage', $stage));

        if ($view === 'pipeline') {
            // Group by stage for Kanban view
            $byStage = [];
            foreach (Deal::STAGES as $stage) {
                $byStage[$stage] = (clone $query)
                    ->where('stage', $stage)
                    ->latest()
                    ->get();
            }

            return Inertia::render('crm/deals/pipeline', [
                'byStage'     => $byStage,
                'stages'      => Deal::STAGES,
                'teamMembers' => User::select('id', 'name')->get(),
                'filters'     => $request->only(['search', 'owner_id']),
                'totals'      => $this->stageTotals(),
            ]);
        }

        return Inertia::render('crm/deals/index', [
            'deals'       => $query->latest()->paginate(20)->withQueryString(),
            'stages'      => Deal::STAGES,
            'teamMembers' => User::select('id', 'name')->get(),
            'filters'     => $request->only(['search', 'stage', 'owner_id']),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('crm/deals/form', [
            'contacts'    => Contact::select('id', 'first_name', 'last_name')->get()->map(fn ($c) => ['id' => $c->id, 'name' => $c->full_name]),
            'companies'   => Company::select('id', 'name')->orderBy('name')->get(),
            'teamMembers' => User::select('id', 'name')->get(),
            'stages'      => Deal::STAGES,
        ]);
    }

    public function store(StoreDealRequest $request): RedirectResponse
    {
        Deal::create([
            ...$request->validated(),
            'owner_id' => $request->validated('owner_id') ?? auth()->id(),
        ]);

        return redirect()->route('deals.index')
            ->with('success', 'Deal created successfully.');
    }

    public function show(Deal $deal): Response
    {
        $deal->load(['contact', 'company', 'owner', 'activities.owner']);

        return Inertia::render('crm/deals/show', [
            'deal'          => $deal,
            'stages'        => Deal::STAGES,
            'activityTypes' => ['call', 'email', 'meeting', 'note', 'task'],
        ]);
    }

    public function edit(Deal $deal): Response
    {
        return Inertia::render('crm/deals/form', [
            'deal'        => $deal,
            'contacts'    => Contact::select('id', 'first_name', 'last_name')->get()->map(fn ($c) => ['id' => $c->id, 'name' => $c->full_name]),
            'companies'   => Company::select('id', 'name')->orderBy('name')->get(),
            'teamMembers' => User::select('id', 'name')->get(),
            'stages'      => Deal::STAGES,
        ]);
    }

    public function update(UpdateDealRequest $request, Deal $deal): RedirectResponse
    {
        $data = $request->validated();

        // Mark closed_at when moving to won/lost
        if (in_array($data['stage'] ?? null, ['won', 'lost'], true) && $deal->closed_at === null) {
            $data['closed_at'] = now();
        } elseif (isset($data['stage']) && ! in_array($data['stage'], ['won', 'lost'], true)) {
            $data['closed_at'] = null;
        }

        $deal->update($data);

        return redirect()->route('deals.show', $deal)
            ->with('success', 'Deal updated successfully.');
    }

    public function destroy(Deal $deal): RedirectResponse
    {
        $deal->delete();

        return redirect()->route('deals.index')
            ->with('success', 'Deal deleted.');
    }

    /** @return array<string, array{count: int, total: float}> */
    private function stageTotals(): array
    {
        $rows = Deal::selectRaw('stage, count(*) as count, coalesce(sum(value),0) as total')
            ->groupBy('stage')
            ->pluck('count', 'stage')
            ->toArray();

        $totals = [];
        foreach (Deal::STAGES as $stage) {
            $totals[$stage] = ['count' => (int) ($rows[$stage] ?? 0), 'total' => 0.0];
        }

        Deal::selectRaw('stage, coalesce(sum(value),0) as total')
            ->groupBy('stage')
            ->get()
            ->each(function ($row) use (&$totals): void {
                $totals[$row->stage]['total'] = (float) $row->total;
            });

        return $totals;
    }
}

<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use App\Models\PipelineStage;
use App\Models\User;
use App\Http\Requests\Lead\StoreLeadRequest;
use App\Http\Requests\Lead\UpdateLeadRequest;
use App\Services\Lead\LeadService;
use App\Services\Pipeline\PipelineService;
use App\Services\Dashboard\DashboardMetricsService;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Facades\Auth;

class LeadController extends Controller
{
    public function __construct(
        protected LeadService $leadService,
        protected PipelineService $pipelineService,
        protected DashboardMetricsService $metricsService,
    ) {
    }

    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Lead::class);

        $leads = $this->leadService->list(
            filters: $request->only(['status', 'pipeline_stage_id', 'owner_id', 'search', 'source']),
            perPage: 20,
        );

        return Inertia::render('leads/index', [
            'leads'          => $leads,
            'filters'        => $request->only(['status', 'pipeline_stage_id', 'owner_id', 'search']),
            'pipelineStages' => PipelineStage::orderBy('order')->get(['id', 'name', 'key', 'color']),
            'users'          => User::select(['id', 'name'])->orderBy('name')->get(),
            'statistics'     => $this->leadService->getStatistics(),
        ]);
    }

    public function create(): Response
    {
        $this->authorize('create', Lead::class);
        return Inertia::render('leads/create', [
            'pipelineStages' => PipelineStage::orderBy('order')->get(['id', 'name', 'key']),
            'users'         => User::select(['id', 'name'])->orderBy('name')->get(),
        ]);
    }

    public function store(StoreLeadRequest $request): RedirectResponse
    {
        $this->authorize('create', Lead::class);
        $lead = $this->leadService->create(array_merge($request->validated(), ['created_by' => Auth::id()]));

        return redirect()->route('web.leads.show', $lead)
            ->with('success', 'Lead created successfully.');
    }

    public function show(Lead $lead): Response
    {
        $this->authorize('view', $lead);
        $lead->load(['owner:id,name,avatar', 'pipelineStage', 'questions', 'activities', 'opportunity', 'tags', 'comments.user']);

        return Inertia::render('leads/show', [
            'lead'           => $lead,
            'users'          => User::select(['id', 'name'])->orderBy('name')->get(),
            'pipelineStages' => PipelineStage::orderBy('order')->get(['id', 'name', 'key', 'color']),
            'canEdit'        => $this->can('update', $lead),
        ]);
    }

    public function edit(Lead $lead): Response
    {
        $this->authorize('update', $lead);
        $lead->load(['owner:id,name', 'pipelineStage', 'tags']);

        return Inertia::render('leads/edit', [
            'lead'           => $lead,
            'users'          => User::select(['id', 'name'])->orderBy('name')->get(),
            'pipelineStages' => PipelineStage::orderBy('order')->get(['id', 'name', 'key']),
        ]);
    }

    public function update(UpdateLeadRequest $request, Lead $lead): RedirectResponse
    {
        $this->authorize('update', $lead);
        $this->leadService->update($lead, $request->validated());

        return redirect()->route('web.leads.show', $lead)
            ->with('success', 'Lead updated successfully.');
    }

    public function destroy(Lead $lead): RedirectResponse
    {
        $this->authorize('delete', $lead);
        $this->leadService->delete($lead);

        return redirect()->route('web.leads.index')
            ->with('success', 'Lead deleted.');
    }

    public function restore(int $id): RedirectResponse
    {
        $lead = Lead::withTrashed()->findOrFail($id);
        $this->authorize('update', $lead);
        $lead->restore();

        return redirect()->route('web.leads.show', $lead)
            ->with('success', 'Lead restored.');
    }

    public function transition(Request $request, Lead $lead): RedirectResponse
    {
        $this->authorize('update', $lead);
        $request->validate(['status' => ['required', 'string']]);
        $this->leadService->transition($request->status, $lead);

        return back()->with('success', 'Lead status updated.');
    }

    // ── Bulk operations ───────────────────────────────────────────────────────

    /**
     * The bulk UI posts `lead_ids`; older callers post `ids`. Normalise to `ids`.
     */
    private function normaliseBulkIds(Request $request): void
    {
        if (! $request->has('ids') && $request->has('lead_ids')) {
            $request->merge(['ids' => $request->input('lead_ids')]);
        }
    }

    public function bulkDelete(Request $request): RedirectResponse
    {
        $this->normaliseBulkIds($request);
        $request->validate(['ids' => ['required', 'array'], 'ids.*' => ['integer']]);
        Lead::whereIn('id', $request->ids)->delete();
        return back()->with('success', count($request->ids) . ' leads deleted.');
    }

    public function bulkUpdateStatus(Request $request): RedirectResponse
    {
        $this->normaliseBulkIds($request);
        $request->validate(['ids' => ['required', 'array'], 'status' => ['required', 'string']]);
        Lead::whereIn('id', $request->ids)->update(['status' => $request->status]);
        return back()->with('success', 'Status updated.');
    }

    public function bulkAssign(Request $request): RedirectResponse
    {
        $this->normaliseBulkIds($request);
        $request->validate(['ids' => ['required', 'array'], 'owner_id' => ['required', 'exists:users,id']]);
        Lead::whereIn('id', $request->ids)->update(['owner_id' => $request->owner_id]);
        return back()->with('success', 'Leads assigned.');
    }

    public function bulkUpdateStage(Request $request): RedirectResponse
    {
        $this->normaliseBulkIds($request);
        $request->validate(['ids' => ['required', 'array'], 'pipeline_stage_id' => ['required', 'exists:pipeline_stages,id']]);
        Lead::whereIn('id', $request->ids)->update(['pipeline_stage_id' => $request->pipeline_stage_id]);
        return back()->with('success', 'Stage updated.');
    }

    public function bulkExport(Request $request)
    {
        $this->normaliseBulkIds($request);
        $this->authorize('viewAny', Lead::class);
        $ids    = $request->input('ids', []);
        $leads  = Lead::with('owner', 'pipelineStage')
            ->when(!empty($ids), fn ($q) => $q->whereIn('id', $ids))
            ->get();

        $filename = 'leads-' . now()->format('Y-m-d') . '.csv';

        return response()->stream(function () use ($leads) {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['ID', 'Title', 'Status', 'Owner', 'Pipeline Stage', 'Created']);
            foreach ($leads as $l) {
                fputcsv($out, [
                    $l->id, $l->title, $l->status,
                    $l->owner?->name ?? '',
                    $l->pipelineStage?->name ?? '',
                    $l->created_at->toDateString(),
                ]);
            }
            fclose($out);
        }, 200, [
            'Content-Type'        => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }
}

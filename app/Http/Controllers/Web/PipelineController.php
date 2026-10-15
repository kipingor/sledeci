<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\PipelineStage;
use App\Models\Lead;
use App\Services\Pipeline\PipelineService;
use App\Services\Dashboard\DashboardMetricsService;
use Illuminate\Support\Str;

class PipelineController extends Controller
{
    public function __construct(
        protected DashboardMetricsService $metricsService,
        protected PipelineService $pipelineService
    ) {}

    /**
     * Display the pipeline kanban board
     */
    public function index(Request $request)
    {
        $this->authorize('viewAny', Lead::class);

        // Get stages with leads (same data structure as API)
        $leadsByStage = $this->pipelineService->getLeadsByStage();

        // Get pipeline analytics for metrics
        $analytics = $this->pipelineService->getAnalytics();

        // Get all stages with their leads (eager loaded to prevent N+1)
        // Transform for frontend
        $stages = $leadsByStage->map(function ($stage) {
            return [
                'id' => $stage->id,
                'name' => $stage->name,
                'key' => $stage->key,
                'color' => $stage->color ?? $this->getDefaultStageColor($stage->key),
                'order' => $stage->order,
                'leads' => $stage->leads->map(function ($lead) {
                    return [
                        'id' => $lead->id,
                        'title' => $lead->title,
                        'status' => $lead->status,
                        'pipeline_stage_id' => $lead->pipeline_stage_id,
                        'created_at' => $lead->created_at->toISOString(),
                        'owner' => [
                            'id' => $lead->owner?->id,
                            'name' => $lead->owner?->name ?? 'Unassigned',
                            'avatar' => $lead->owner?->avatar,
                        ],
                    ];
                })->toArray(),
            ];
        })->toArray();

        // Build metrics matching frontend interface exactly
        $metrics = [
            'totalLeads' => $analytics['total_leads'] ?? 0,
            'totalValue' => Lead::sum('estimated_value') ?? 0,
            'conversionRate' => $analytics['conversion_rate'] ?? 0,
        ];

        return Inertia::render('leads/pipeline', [
            'stages' => $stages,
            'metrics' => $metrics,
        ]);
    }

    /**
     * Show the form for creating a new pipeline stage
     */
    public function create()
    {
        $this->authorize('create', PipelineStage::class);

        return Inertia::render('pipelines/create');
    }

    /**
     * Store a newly created pipeline stage
     */
    public function store(Request $request)
    {
        $this->authorize('create', PipelineStage::class);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'key' => ['nullable', 'string', 'max:255', 'unique:pipeline_stages,key'],
            'color' => ['nullable', 'string', 'max:7'],
            'order' => ['nullable', 'integer'],
        ]);

        // Generate key from name if not provided
        if (!isset($validated['key'])) {
            $validated['key'] = Str::slug($validated['name']);
        }

        // Set order to last if not provided
        if (!isset($validated['order'])) {
            $validated['order'] = PipelineStage::max('order') + 1;
        }

        $stage = PipelineStage::create($validated);

        return redirect()
            ->route('web.pipelines.index')
            ->with('success', 'Pipeline stage created successfully.');
    }

    /**
     * Display the specified pipeline stage
     */
    public function show($id)
    {
        $pipeline = PipelineStage::with('leads')->findOrFail($id);

        $this->authorize('view', $pipeline);

        return Inertia::render('pipelines/show', [
            'pipeline' => $pipeline,
        ]);
    }

    /**
     * Show the form for editing the specified pipeline stage
     */
    public function edit($id)
    {
        $pipeline = PipelineStage::findOrFail($id);

        $this->authorize('update', $pipeline);

        return Inertia::render('pipelines/edit', [
            'pipeline' => $pipeline,
        ]);
    }

    /**
     * Update the specified pipeline stage
     */
    public function update(Request $request, $id)
    {
        $pipeline = PipelineStage::findOrFail($id);

        $this->authorize('update', $pipeline);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'key' => ['required', 'string', 'max:255', 'unique:pipeline_stages,key,' . $id],
            'color' => ['nullable', 'string', 'max:7'],
            'order' => ['nullable', 'integer'],
        ]);

        $pipeline->update($validated);

        return redirect()
            ->route('web.pipelines.index')
            ->with('success', 'Pipeline stage updated successfully.');
    }

    /**
     * Remove the specified pipeline stage
     */
    public function destroy($id)
    {
        $pipeline = PipelineStage::findOrFail($id);

        $this->authorize('delete', $pipeline);

        // Check if stage has leads
        if ($pipeline->leads()->count() > 0) {
            return redirect()
                ->back()
                ->with('error', 'Cannot delete stage with leads. Please move or delete leads first.');
        }

        $pipeline->delete();

        return redirect()
            ->route('web.pipelines.index')
            ->with('success', 'Pipeline stage deleted successfully.');
    }

    /**
     * Get default color for a stage based on its key/name
     * Maps stage names to appropriate colors
     */
    private function getDefaultStageColor(string $key): string
    {
        $colors = [
            'new' => '#3b82f6',           // Blue
            'contacted' => '#06b6d4',     // Cyan
            'qualified' => '#10b981',     // Green
            'proposal' => '#8b5cf6',      // Purple
            'proposal_sent' => '#8b5cf6', // Purple
            'negotiation' => '#f59e0b',   // Amber
            'won' => '#059669',           // Emerald
            'closed_won' => '#059669',    // Emerald
            'lost' => '#ef4444',          // Red
            'closed_lost' => '#ef4444',   // Red
            'archived' => '#6b7280',      // Gray
        ];

        $normalizedKey = strtolower(str_replace([' ', '-'], '_', $key));

        // Try exact match first
        if (isset($colors[$normalizedKey])) {
            return $colors[$normalizedKey];
        }

        // Try partial match
        foreach ($colors as $colorKey => $colorValue) {
            if (str_contains($normalizedKey, $colorKey)) {
                return $colorValue;
            }
        }

        return '#6b7280'; // Default gray
    }

    /**
     * Display pipeline settings
     */
    public function settings()
    {
        $stages = PipelineStage::orderBy('order')->get();

        return Inertia::render('pipelines/settings', [
            'stages' => $stages,
        ]);
    }

    /**
     * Display pipeline reports
     */
    public function reports()
    {
        $analytics = $this->pipelineService->getAnalytics();

        return Inertia::render('pipelines/reports', [
            'analytics' => $analytics,
        ]);
    }

    /**
     * Display pipeline dashboard
     */
    public function dashboard()
    {
        $overview = $this->metricsService->getOverview();

        return Inertia::render('pipelines/dashboard', [
            'overview' => $overview,
        ]);
    }
}
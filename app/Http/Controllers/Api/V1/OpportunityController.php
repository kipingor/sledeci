<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\OpportunityStage;
use App\Http\Controllers\Controller;
use App\Models\Opportunity;
use App\Services\Opportunity\OpportunityService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class OpportunityController extends Controller
{
    public function __construct(
        protected OpportunityService $opportunityService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Opportunity::class);

        $opportunities = Opportunity::with(['lead:id,title', 'owner:id,name,avatar'])
            ->when($request->filled('stage'), fn ($q) => $q->byStage(OpportunityStage::from($request->stage)))
            ->when($request->filled('owner_id'), fn ($q) => $q->where('owner_id', $request->owner_id))
            ->when($request->filled('search'), fn ($q) => $q->search($request->search))
            ->latest()
            ->paginate($request->integer('per_page', 15));

        return response()->json(['success' => true, 'data' => $opportunities]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Opportunity::class);

        $validated = $request->validate([
            'lead_id' => ['nullable', 'exists:leads,id'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'estimated_value' => ['nullable', 'numeric', 'min:0'],
            'probability' => ['nullable', 'integer', 'min:0', 'max:100'],
            'stage' => ['nullable', 'in:qualification,proposal,negotiation,closed_won,closed_lost'],
            'expected_close_date' => ['nullable', 'date'],
            'contact_name' => ['nullable', 'string', 'max:255'],
            'contact_email' => ['nullable', 'email'],
            'contact_phone' => ['nullable', 'string', 'max:50'],
        ]);

        $validated['owner_id'] = $request->input('owner_id', Auth::id());
        $opportunity = Opportunity::create($validated);
        $opportunity->load(['lead:id,title', 'owner:id,name,avatar']);

        return response()->json(['success' => true, 'data' => $opportunity], 201);
    }

    public function show(Opportunity $opportunity): JsonResponse
    {
        $this->authorize('view', $opportunity);
        $opportunity->load(['lead.owner', 'lead.pipelineStage', 'owner']);

        return response()->json(['success' => true, 'data' => $opportunity]);
    }

    public function update(Request $request, Opportunity $opportunity): JsonResponse
    {
        $this->authorize('update', $opportunity);

        $opportunity->update($request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'estimated_value' => ['nullable', 'numeric', 'min:0'],
            'probability' => ['nullable', 'integer', 'min:0', 'max:100'],
            'stage' => ['nullable', 'in:qualification,proposal,negotiation,closed_won,closed_lost'],
            'expected_close_date' => ['nullable', 'date'],
            'contact_name' => ['nullable', 'string', 'max:255'],
            'contact_email' => ['nullable', 'email'],
            'contact_phone' => ['nullable', 'string', 'max:50'],
        ]));

        return response()->json(['success' => true, 'data' => $opportunity->fresh()->load(['lead:id,title', 'owner:id,name,avatar'])]);
    }

    public function destroy(Opportunity $opportunity): JsonResponse
    {
        $this->authorize('delete', $opportunity);
        $opportunity->delete();

        return response()->json(['success' => true], 204);
    }

    public function markAsWon(Opportunity $opportunity): JsonResponse
    {
        $this->authorize('update', $opportunity);
        // FIX: service now returns Opportunity, not bool
        $opportunity = $this->opportunityService->markAsWon($opportunity);

        return response()->json(['success' => true, 'message' => 'Marked as won', 'data' => $opportunity]);
    }

    public function markAsLost(Request $request, Opportunity $opportunity): JsonResponse
    {
        $this->authorize('update', $opportunity);
        $validated = $request->validate(['reason' => ['nullable', 'string', 'max:1000']]);
        $opportunity = $this->opportunityService->markAsLost($opportunity, $validated['reason'] ?? null);

        return response()->json(['success' => true, 'message' => 'Marked as lost', 'data' => $opportunity]);
    }

    public function statistics(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Opportunity::class);

        return response()->json(['success' => true, 'data' => $this->opportunityService->getStatistics()]);
    }

    public function moveStage(Request $request, Opportunity $opportunity): JsonResponse
    {
        $this->authorize('update', $opportunity);
        $validated = $request->validate([
            'stage' => ['required', 'in:qualification,proposal,negotiation,closed_won,closed_lost'],
        ]);
        $opportunity->update([
            'stage' => $validated['stage'],
            'probability' => OpportunityStage::from($validated['stage'])->defaultProbability(),
        ]);

        return response()->json(['success' => true, 'data' => $opportunity->fresh()]);
    }

    public function kanban(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Opportunity::class);

        $opportunities = Opportunity::with(['lead:id,title', 'owner:id,name,avatar'])
            ->when($request->filled('owner_id'), fn ($q) => $q->where('owner_id', $request->owner_id))
            ->when($request->filled('search'), fn ($q) => $q->search($request->search))
            ->get()
            ->groupBy(fn ($opp) => $opp->getRawOriginal('stage') ?? 'qualification');

        $kanban = [];
        foreach (OpportunityStage::cases() as $stage) {
            $group = $opportunities->get($stage->value, collect());
            $kanban[$stage->value] = [
                'stage' => $stage->value,
                'label' => $stage->label(),
                'color' => $stage->color(),
                'opportunities' => $group->values(),
                'total_count' => $group->count(),
                'total_value' => (float) $group->sum('estimated_value'),
                'weighted_value' => (float) $group->sum('weighted_value'),
            ];
        }

        return response()->json(['success' => true, 'data' => $kanban]);
    }
}

<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Proposal;
use App\Models\Lead;
use App\Services\Proposal\ProposalGenerationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProposalController extends Controller
{
    public function __construct(
        protected ProposalGenerationService $proposalService
    ) {}

    /**
     * Display a listing of proposals
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Proposal::class);

        $query = Proposal::with(['lead.owner']);

        // Apply filters
        if ($request->has('lead_id')) {
            $query->where('lead_id', $request->input('lead_id'));
        }

        if ($request->has('status')) {
            $query->where('status', $request->input('status'));
        }

        $perPage = $request->integer('per_page', 15);
        $proposals = $query->latest()->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $proposals,
        ]);
    }

    /**
     * Generate a new AI-powered proposal
     */
    public function generate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'lead_id' => 'required|exists:leads,id',
            'template' => 'nullable|string|in:standard,technical,executive',
            'tone' => 'nullable|string|in:formal,friendly,professional',
            'length' => 'nullable|string|in:brief,standard,detailed',
            'include_pricing' => 'nullable|boolean',
            'custom_instructions' => 'nullable|string|max:2000',
        ]);

        $lead = Lead::findOrFail($validated['lead_id']);

        $this->authorize('create', [Proposal::class, $lead]);

        $proposal = $this->proposalService->generate(
            $lead,
            [
                'template' => $validated['template'] ?? 'standard',
                'tone' => $validated['tone'] ?? 'professional',
                'length' => $validated['length'] ?? 'standard',
                'include_pricing' => $validated['include_pricing'] ?? true,
                'custom_instructions' => $validated['custom_instructions'] ?? null,
            ]
        );

        return response()->json([
            'success' => true,
            'message' => 'Proposal generated successfully',
            'data' => $proposal,
        ], 201);
    }

    /**
     * Store a manually created proposal
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'lead_id' => 'required|exists:leads,id',
            'title' => 'required|string|max:255',
            'content' => 'required|string',
            'status' => 'nullable|in:draft,sent,accepted,rejected',
        ]);

        $lead = Lead::findOrFail($validated['lead_id']);

        $this->authorize('create', [Proposal::class, $lead]);

        $proposal = Proposal::create([
            'lead_id' => $validated['lead_id'],
            'title' => $validated['title'],
            'content' => $validated['content'],
            'status' => $validated['status'] ?? 'draft',
            'generated_by_ai' => false,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Proposal created successfully',
            'data' => $proposal->load('lead'),
        ], 201);
    }

    /**
     * Display the specified proposal
     */
    public function show(Proposal $proposal): JsonResponse
    {
        $this->authorize('view', $proposal);

        $proposal->load(['lead.owner', 'lead.pipelineStage']);

        return response()->json([
            'success' => true,
            'data' => $proposal,
        ]);
    }

    /**
     * Update the specified proposal
     */
    public function update(Request $request, Proposal $proposal): JsonResponse
    {
        $this->authorize('update', $proposal);

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'content' => 'sometimes|required|string',
            'status' => 'sometimes|in:draft,sent,accepted,rejected',
        ]);

        $proposal->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Proposal updated successfully',
            'data' => $proposal->fresh(['lead']),
        ]);
    }

    /**
     * Remove the specified proposal
     */
    public function destroy(Proposal $proposal): JsonResponse
    {
        $this->authorize('delete', $proposal);

        $proposal->delete();

        return response()->json([
            'success' => true,
            'message' => 'Proposal deleted successfully',
        ]);
    }

    /**
     * Send proposal to client
     */
    public function send(Request $request, Proposal $proposal): JsonResponse
    {
        $this->authorize('update', $proposal);

        $validated = $request->validate([
            'email' => 'required|email',
            'subject' => 'nullable|string|max:255',
            'message' => 'nullable|string',
        ]);

        $this->proposalService->send(
            $proposal,
            $validated['email'],
            $validated['subject'] ?? null,
            $validated['message'] ?? null
        );

        $proposal->update([
            'status' => 'sent',
            'sent_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Proposal sent successfully',
            'data' => $proposal->fresh(),
        ]);
    }

    /**
     * Mark proposal as accepted
     */
    public function accept(Proposal $proposal): JsonResponse
    {
        $this->authorize('update', $proposal);

        $proposal->update([
            'status' => 'accepted',
            'accepted_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Proposal marked as accepted',
            'data' => $proposal->fresh(),
        ]);
    }

    /**
     * Mark proposal as rejected
     */
    public function reject(Request $request, Proposal $proposal): JsonResponse
    {
        $this->authorize('update', $proposal);

        $validated = $request->validate([
            'reason' => 'nullable|string|max:1000',
        ]);

        $proposal->update([
            'status' => 'rejected',
            'rejected_at' => now(),
            'rejection_reason' => $validated['reason'] ?? null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Proposal marked as rejected',
            'data' => $proposal->fresh(),
        ]);
    }

    /**
     * Regenerate proposal with AI
     */
    public function regenerate(Request $request, Proposal $proposal): JsonResponse
    {
        $this->authorize('update', $proposal);

        $validated = $request->validate([
            'custom_instructions' => 'nullable|string|max:2000',
        ]);

        $newProposal = $this->proposalService->regenerate(
            $proposal,
            $validated['custom_instructions'] ?? null
        );

        return response()->json([
            'success' => true,
            'message' => 'Proposal regenerated successfully',
            'data' => $newProposal,
        ]);
    }
}
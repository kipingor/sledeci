<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Pipeline\MovePipelineRequest;
use App\Services\Pipeline\PipelineService;
use App\Models\Lead;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PipelineController extends Controller
{
    public function __construct(
        protected PipelineService $pipelineService
    ) {
    }

    /**
     * Get all pipeline stages with leads grouped by stage
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Lead::class);

        $stages = $this->pipelineService->getStagesWithLeads();
        $leadsByStage = $this->pipelineService->getLeadsByStage();

        return response()->json([
            'success' => true,
            'data' => [
                'stages' => $stages,
                'leadsByStage' => $leadsByStage,
            ],
        ]);
    }

    /**
     * Move a lead to another pipeline stage
     */
    public function move(MovePipelineRequest $request, Lead $lead): JsonResponse
    {
        $this->authorize('update', $lead);

        // Move the lead using the service
        $this->pipelineService->moveLead($lead, $request->stageId());

        // Reload the lead with fresh data and relationships
        $lead->refresh();
        $lead->load([
            'owner:id,name,email',
            'pipelineStage:id,key,name,order',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Pipeline stage updated successfully.',
            'data' => $lead,  // Return updated lead with relationships
        ]);
    }

    /**
     * Get leads for a specific pipeline stage
     */
    public function getLeads(Request $request, int $stageId): JsonResponse
    {
        $this->authorize('viewAny', Lead::class);

        $leads = Lead::where('pipeline_stage_id', $stageId)
            ->with(['owner:id,name,email', 'pipelineStage:id,key,name'])
            ->orderBy('order')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $leads,
        ]);
    }
}

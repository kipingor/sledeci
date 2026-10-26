<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AutomationLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AutomationLogController extends Controller
{
    /**
     * Display a listing of automation logs.
     */
    public function index(Request $request): JsonResponse
    {
        $query = AutomationLog::with(['rule']);

        if ($request->has('rule_id')) {
            $query->where('automation_rule_id', $request->rule_id);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $limit = $request->integer('limit', 50);
        $logs = $query->recent($limit)->get();

        return response()->json([
            'success' => true,
            'data' => $logs,
        ]);
    }

    /**
     * Display the specified log.
     */
    public function show(AutomationLog $log): JsonResponse
    {
        $log->load(['rule', 'triggerable']);

        return response()->json([
            'success' => true,
            'data' => $log,
        ]);
    }

    /**
     * Retry a failed automation.
     */
    public function retry(AutomationLog $log): JsonResponse
    {
        if ($log->status !== 'failed') {
            return response()->json([
                'success' => false,
                'message' => 'Can only retry failed automations',
            ], 400);
        }

        try {
            $triggerable = $log->triggerable;
            if (!$triggerable) {
                throw new \Exception('Triggerable model not found');
            }

            $log->rule->execute($triggerable);

            return response()->json([
                'success' => true,
                'message' => 'Automation retried successfully',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Retry failed: ' . $e->getMessage(),
            ], 500);
        }
    }
}

<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AutomationRule;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AutomationRuleController extends Controller
{
    /**
     * Display a listing of automation rules.
     */
    public function index(Request $request): JsonResponse
    {
        $query = AutomationRule::with('creator');

        if ($request->has('active_only')) {
            $query->active();
        }

        if ($request->has('trigger_type')) {
            $query->byTrigger($request->trigger_type);
        }

        $rules = $query->latest()->get();

        return response()->json([
            'success' => true,
            'data' => $rules,
        ]);
    }

    /**
     * Store a newly created automation rule.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'trigger_type' => 'required|string',
            'trigger_conditions' => 'required|array',
            'action_type' => 'required|string',
            'action_config' => 'required|array',
            'is_active' => 'boolean',
        ]);

        $rule = AutomationRule::create([
            'created_by' => Auth::id(),
            ...$validated,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Automation rule created successfully',
            'data' => $rule,
        ], 201);
    }

    /**
     * Display the specified automation rule.
     */
    public function show(AutomationRule $rule): JsonResponse
    {
        $rule->load('creator');

        return response()->json([
            'success' => true,
            'data' => $rule,
        ]);
    }

    /**
     * Update the specified automation rule.
     */
    public function update(Request $request, AutomationRule $rule): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'trigger_type' => 'sometimes|required|string',
            'trigger_conditions' => 'sometimes|required|array',
            'action_type' => 'sometimes|required|string',
            'action_config' => 'sometimes|required|array',
            'is_active' => 'boolean',
        ]);

        $rule->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Automation rule updated successfully',
            'data' => $rule,
        ]);
    }

    /**
     * Remove the specified automation rule.
     */
    public function destroy(AutomationRule $rule): JsonResponse
    {
        $rule->delete();

        return response()->json([
            'success' => true,
            'message' => 'Automation rule deleted successfully',
        ]);
    }

    /**
     * Test an automation rule.
     */
    public function test(Request $request, AutomationRule $rule): JsonResponse
    {
        // TODO: Implement test execution
        // This would create a test log entry without actually executing the action
        
        return response()->json([
            'success' => true,
            'message' => 'Test mode not yet implemented',
        ]);
    }
}

<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ProjectTemplate;
use App\Models\ProjectTemplateTask;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ProjectTemplateController extends Controller
{
    /**
     * Display a listing of templates.
     */
    public function index(Request $request): JsonResponse
    {
        $query = ProjectTemplate::with(['tasks' => fn ($q) => $q->orderBy('order')]);

        if ($request->has('active_only')) {
            $query->active();
        }

        $templates = $query->latest()->get();

        return response()->json([
            'success' => true,
            'data' => $templates,
        ]);
    }

    /**
     * Store a newly created template.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
            'is_default' => 'boolean',
            'estimated_duration_days' => 'nullable|integer|min:1',
            'tasks' => 'required|array',
            'tasks.*.title' => 'required|string|max:255',
            'tasks.*.description' => 'nullable|string',
            'tasks.*.order' => 'required|integer',
            'tasks.*.start_day_offset' => 'required|integer|min:0',
            'tasks.*.duration_days' => 'required|integer|min:1',
            'tasks.*.priority' => 'required|in:low,medium,high,critical',
            'tasks.*.status' => 'nullable|string',
            'tasks.*.checklist' => 'nullable|array',
        ]);

        // If setting as default, unset other defaults
        if ($validated['is_default'] ?? false) {
            ProjectTemplate::where('is_default', true)->update(['is_default' => false]);
        }

        $template = ProjectTemplate::create([
            'created_by' => Auth::id(),
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
            'is_default' => $validated['is_default'] ?? false,
            'estimated_duration_days' => $validated['estimated_duration_days'] ?? null,
        ]);

        // Create tasks
        foreach ($validated['tasks'] as $taskData) {
            $template->tasks()->create($taskData);
        }

        $template->load('tasks');

        return response()->json([
            'success' => true,
            'message' => 'Template created successfully',
            'data' => $template,
        ], 201);
    }

    /**
     * Display the specified template.
     */
    public function show(ProjectTemplate $template): JsonResponse
    {
        $template->load(['tasks' => fn ($q) => $q->orderBy('order')]);

        return response()->json([
            'success' => true,
            'data' => $template,
        ]);
    }

    /**
     * Update the specified template.
     */
    public function update(Request $request, ProjectTemplate $template): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
            'is_default' => 'boolean',
            'estimated_duration_days' => 'nullable|integer|min:1',
            'tasks' => 'sometimes|array',
            'tasks.*.title' => 'required|string|max:255',
            'tasks.*.description' => 'nullable|string',
            'tasks.*.order' => 'required|integer',
            'tasks.*.start_day_offset' => 'required|integer|min:0',
            'tasks.*.duration_days' => 'required|integer|min:1',
            'tasks.*.priority' => 'required|in:low,medium,high,critical',
            'tasks.*.status' => 'nullable|string',
            'tasks.*.checklist' => 'nullable|array',
        ]);

        // If setting as default, unset other defaults
        if (($validated['is_default'] ?? false) && !$template->is_default) {
            ProjectTemplate::where('is_default', true)->update(['is_default' => false]);
        }

        $template->update([
            'name' => $validated['name'] ?? $template->name,
            'description' => $validated['description'] ?? $template->description,
            'is_active' => $validated['is_active'] ?? $template->is_active,
            'is_default' => $validated['is_default'] ?? $template->is_default,
            'estimated_duration_days' => $validated['estimated_duration_days'] ?? $template->estimated_duration_days,
        ]);

        // Update tasks if provided
        if (isset($validated['tasks'])) {
            // Delete existing tasks
            $template->tasks()->delete();
            
            // Create new tasks
            foreach ($validated['tasks'] as $taskData) {
                $template->tasks()->create($taskData);
            }
        }

        $template->load('tasks');

        return response()->json([
            'success' => true,
            'message' => 'Template updated successfully',
            'data' => $template,
        ]);
    }

    /**
     * Remove the specified template.
     */
    public function destroy(ProjectTemplate $template): JsonResponse
    {
        $template->delete();

        return response()->json([
            'success' => true,
            'message' => 'Template deleted successfully',
        ]);
    }

    /**
     * Duplicate a template.
     */
    public function duplicate(ProjectTemplate $template): JsonResponse
    {
        $newTemplate = $template->replicate();
        $newTemplate->name = $template->name . ' (Copy)';
        $newTemplate->is_default = false;
        $newTemplate->created_by = Auth::id();
        $newTemplate->save();

        // Duplicate tasks
        foreach ($template->tasks as $task) {
            $newTask = $task->replicate();
            $newTask->template_id = $newTemplate->id;
            $newTask->save();
        }

        $newTemplate->load('tasks');

        return response()->json([
            'success' => true,
            'message' => 'Template duplicated successfully',
            'data' => $newTemplate,
        ], 201);
    }
}

<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Department;
use App\Http\Resources\DepartmentResource;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class DepartmentController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(
            DepartmentResource::collection(Department::with('head:id,name')->paginate(20))
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'        => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'head_id'     => ['nullable', 'exists:users,id'],
        ]);

        return response()->json(new DepartmentResource(Department::create($data)), 201);
    }

    public function show(Department $department): JsonResponse
    {
        return response()->json(new DepartmentResource($department->load('head:id,name')));
    }

    public function update(Request $request, Department $department): JsonResponse
    {
        // FIX: was $request->all() — no validation, mass-assignment risk
        $department->update($request->validate([
            'name'        => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'head_id'     => ['nullable', 'exists:users,id'],
        ]));

        return response()->json(new DepartmentResource($department->fresh()->load('head:id,name')));
    }

    public function destroy(Department $department): JsonResponse
    {
        $department->delete();
        return response()->json(null, 204);
    }
}
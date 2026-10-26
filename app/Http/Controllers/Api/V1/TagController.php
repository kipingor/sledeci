<?php
namespace App\Http\Controllers\Api\V1;

use App\Models\Tag;
use App\Http\Resources\TagResource;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class TagController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(TagResource::collection(Tag::orderBy('name')->paginate(50)));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'  => ['required', 'string', 'max:100', 'unique:tags,name'],
            'color' => ['nullable', 'string', 'max:20'],
        ]);
        return response()->json(new TagResource(Tag::create($data)), 201);
    }

    public function show(Tag $tag): JsonResponse
    {
        return response()->json(new TagResource($tag));
    }

    public function update(Request $request, Tag $tag): JsonResponse
    {
        // FIX: was $request->all()
        $tag->update($request->validate([
            'name'  => ['sometimes', 'string', 'max:100', 'unique:tags,name,' . $tag->id],
            'color' => ['nullable', 'string', 'max:20'],
        ]));
        return response()->json(new TagResource($tag->fresh()));
    }

    public function destroy(Tag $tag): JsonResponse
    {
        $tag->delete();
        return response()->json(null, 204);
    }
}
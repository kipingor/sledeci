<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Comment;
use App\Http\Resources\CommentResource;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class CommentController extends Controller
{
    public function index()
    {
        return CommentResource::collection(
            Comment::with('user')->paginate(20)
        );
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'commentable_type' => 'required|string',
            'commentable_id' => 'required|integer',
            'body' => 'required|string',
        ]);

        $data['user_id'] = $request->user()->id;

        return new CommentResource(Comment::create($data));
    }

    public function show(Comment $comment)
    {
        return new CommentResource($comment->load('user'));
    }

    public function update(Request $request, Comment $comment)
    {
        $this->guardOwnership($request, $comment);

        $comment->update($request->only('body', 'metadata'));

        return new CommentResource($comment);
    }

    public function destroy(Request $request, Comment $comment)
    {
        $this->guardOwnership($request, $comment);

        $comment->delete();

        return response()->noContent();
    }

    /** Only the author (or an admin) may modify or delete a comment. */
    private function guardOwnership(Request $request, Comment $comment): void
    {
        abort_unless(
            $request->user()->id === $comment->user_id || $request->user()->hasRole('admin'),
            403,
            'You can only modify your own comments.'
        );
    }
}

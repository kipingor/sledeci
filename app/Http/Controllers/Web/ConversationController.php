<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\Lead;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Facades\Auth;

/**
 * ConversationController
 */
class ConversationController extends Controller
{
    public function index(Request $request)
    {
        $conversations = Conversation::with(['lead:id,title', 'sender'])
            ->when($request->filled('lead_id'), fn ($q) => $q->where('lead_id', $request->lead_id))
            ->when($request->filled('search'),  fn ($q) => $q->where('message', 'like', "%{$request->search}%"))
            ->latest()
            ->paginate((int) $request->input('per_page', 20))
            ->withQueryString();

        if ($request->wantsJson()) {
            return response()->json($conversations);
        }

        return Inertia::render('conversations/index', [
            'conversations' => $conversations,
            'filters'       => $request->only(['lead_id', 'search']),
        ]);
    }

    public function show(Request $request, int $id)
    {
        $conversation = Conversation::with(['lead:id,title,status', 'sender'])->findOrFail($id);

        if ($request->wantsJson()) {
            return response()->json($conversation);
        }

        return Inertia::render('conversations/show', compact('conversation'));
    }

    public function create(Request $request): Response
    {
        // FIX: was view('conversations.create') — Blade view does not exist
        return Inertia::render('conversations/create', [
            'leads' => Lead::select(['id', 'title'])->orderBy('title')->limit(200)->get(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'lead_id' => ['required', 'exists:leads,id'],
            'message' => ['required', 'string', 'max:5000'],
        ]);

        $data['sender_type'] = get_class(Auth::user());
        $data['sender_id']   = Auth::id();

        $conversation = Conversation::create($data);

        if ($request->wantsJson()) {
            return response()->json($conversation, 201);
        }

        // FIX: was route('conversations.show') — missing web. prefix
        return redirect()->route('web.conversations.show', $conversation->id)
            ->with('success', 'Conversation created.');
    }

    public function edit(Request $request, int $id): Response
    {
        $conversation = Conversation::with('lead:id,title')->findOrFail($id);

        // FIX: was view('conversations.edit')
        return Inertia::render('conversations/edit', [
            'conversation' => $conversation,
            'leads'        => Lead::select(['id', 'title'])->orderBy('title')->limit(200)->get(),
        ]);
    }

    public function update(Request $request, int $id)
    {
        $conversation = Conversation::findOrFail($id);

        $conversation->update($request->validate([
            'lead_id' => ['sometimes', 'exists:leads,id'],
            'message' => ['required', 'string', 'max:5000'],
        ]));

        if ($request->wantsJson()) {
            return response()->json($conversation->fresh());
        }

        return redirect()->route('web.conversations.show', $conversation->id)
            ->with('success', 'Conversation updated.');
    }

    public function destroy(Request $request, int $id)
    {
        Conversation::findOrFail($id)->delete();

        if ($request->wantsJson()) {
            return response()->json(['message' => 'Deleted.']);
        }

        return redirect()->route('web.conversations.index')
            ->with('success', 'Conversation deleted.');
    }
}
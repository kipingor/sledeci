<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Message;
use App\Http\Resources\MessageResource;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class MessageController extends Controller
{
    public function index(Request $request)
    {
        return MessageResource::collection(
            Message::where('receiver_id', $request->user()->id)
                ->with('sender', 'receiver')
                ->paginate(20)
        );
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'receiver_id' => 'required|exists:users,id',
            'body' => 'required|string',
        ]);

        $data['sender_id'] = $request->user()->id;

        return new MessageResource(
            Message::create($data)->load('sender', 'receiver')
        );
    }

    public function show(Message $message)
    {
        return new MessageResource($message->load('sender', 'receiver'));
    }

    public function destroy(Message $message)
    {
        $message->delete();

        return response()->noContent();
    }
}

<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Notification;
use App\Http\Resources\NotificationResource;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        return NotificationResource::collection(
            Notification::where('user_id', $request->user()->id)->paginate(20)
        );
    }

    public function show(Notification $notification)
    {
        return new NotificationResource($notification);
    }

    public function markRead(Notification $notification)
    {
        $notification->update(['read_at' => now()]);

        return new NotificationResource($notification);
    }
}

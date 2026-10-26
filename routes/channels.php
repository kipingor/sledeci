<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

use App\Models\Lead;
use Illuminate\Broadcasting\PrivateChannel;

Broadcast::channel('leads.{leadId}', function ($user, $leadId) {
    // Allow lead owner or admin to listen on the private channel. Adjust as needed.
    $lead = Lead::find($leadId);
    if (!$lead) {
        return false;
    }
    if (method_exists($user, 'hasRole') && $user->hasRole('admin')) {
        return true;
    }
    return $lead->owner_id === $user->id || $lead->created_by === $user->id;
});

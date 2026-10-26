<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Policies\ConversationPolicy;
use Illuminate\Database\Eloquent\Attributes\UsePolicy;

#[UsePolicy(ConversationPolicy::class)]
class Conversation extends Model
{
    protected $fillable = [
        'lead_id',
        'message',
        'sender_type',
        'sender_id',
    ];

    public function lead()
    {
        return $this->belongsTo(Lead::class);
    }

    public function sender()
    {
        return $this->morphTo(null, 'sender_type', 'sender_id');
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Contact extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'owner_id', 'lead_id',
        'name', 'email', 'phone', 'company', 'role',
        'event_name', 'event_location', 'met_at', 'source',
        'talking_points', 'key_topics', 'notes',
        'status', 'follow_up_count', 'last_contact_at', 'next_follow_up_at',
        'ai_email_draft', 'ai_follow_up_schedule', 'ai_context_summary',
    ];

    protected $casts = [
        'met_at' => 'date',
        'last_contact_at' => 'datetime',
        'next_follow_up_at' => 'datetime',
        'key_topics' => 'array',
        'ai_follow_up_schedule' => 'array',
        'ai_context_summary' => 'array',
    ];

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function followUps(): HasMany
    {
        return $this->hasMany(ContactFollowUp::class)->orderBy('sequence');
    }

    public function nextScheduledFollowUp(): ?ContactFollowUp
    {
        return $this->followUps()
            ->where('status', 'scheduled')
            ->where('scheduled_at', '>=', now())
            ->orderBy('scheduled_at')
            ->first();
    }
}

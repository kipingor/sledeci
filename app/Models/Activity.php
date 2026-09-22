<?php

namespace App\Models;

use App\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Activity extends Model
{
    /** @use HasFactory<\Database\Factories\ActivityFactory> */
    use BelongsToTenant;
    use HasFactory;

    protected $fillable = [
        'tenant_id',
        'type',
        'subject',
        'body',
        'due_at',
        'done_at',
        'actable_type',
        'actable_id',
        'owner_id',
    ];

    protected $casts = [
        'due_at'  => 'datetime',
        'done_at' => 'datetime',
    ];

    public const TYPES = ['call', 'email', 'meeting', 'note', 'task'];

    /** @return MorphTo<Model, $this> */
    public function actable(): MorphTo
    {
        return $this->morphTo();
    }

    /** @return BelongsTo<User, $this> */
    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function isDone(): bool
    {
        return $this->done_at !== null;
    }

    public function markDone(): void
    {
        $this->update(['done_at' => now()]);
    }

}

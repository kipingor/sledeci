<?php

namespace App\Models;

use App\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Project extends Model
{
    use BelongsToTenant;
    use HasFactory;

    protected $fillable = [
        'tenant_id', 'name', 'code', 'description', 'status', 'priority',
        'start_date', 'due_date', 'budget', 'currency', 'owner_id',
    ];

    protected $casts = [
        'budget'     => 'decimal:2',
        'start_date' => 'date',
        'due_date'   => 'date',
    ];

    public const STATUSES = ['planning', 'active', 'on_hold', 'completed', 'archived'];
    public const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

    /** @return BelongsTo<User, $this> */
    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    /** @return HasMany<Task, $this> */
    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }

    public function getCompletionPercentageAttribute(): int
    {
        $total = (int) ($this->tasks_count ?? $this->tasks()->count());
        if ($total === 0) {
            return 0;
        }

        $done = (int) ($this->completed_tasks_count ?? $this->tasks()->where('status', 'done')->count());

        return (int) round(($done / $total) * 100);
    }
}

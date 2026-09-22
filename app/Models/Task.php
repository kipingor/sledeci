<?php

namespace App\Models;

use App\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Task extends Model
{
    use BelongsToTenant;
    use HasFactory;

    protected $fillable = [
        'tenant_id', 'project_id', 'parent_task_id', 'title', 'description',
        'status', 'priority', 'start_date', 'due_date', 'completed_at',
        'assignee_id', 'created_by',
    ];

    protected $casts = [
        'start_date'    => 'date',
        'due_date'      => 'date',
        'completed_at'  => 'datetime',
    ];

    public const STATUSES = ['todo', 'in_progress', 'review', 'done'];
    public const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

    /** @return BelongsTo<Project, $this> */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /** @return BelongsTo<Task, $this> */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(Task::class, 'parent_task_id');
    }

    /** @return HasMany<Task, $this> */
    public function children(): HasMany
    {
        return $this->hasMany(Task::class, 'parent_task_id');
    }

    /** @return BelongsTo<User, $this> */
    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assignee_id');
    }

    /** @return BelongsTo<User, $this> */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function isDone(): bool
    {
        return $this->status === 'done';
    }

    public function markDone(): void
    {
        $this->update(['status' => 'done', 'completed_at' => now()]);
    }
}

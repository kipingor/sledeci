<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\Pivot;

class ProjectTask extends Pivot
{
    public const STATUS_PENDING = 'pending';

    public const STATUS_IN_PROGRESS = 'in_progress';

    public const STATUS_COMPLETED = 'completed';

    public const STATUS_DELAYED = 'delayed';

    public const STATUSES = [
        self::STATUS_PENDING,
        self::STATUS_IN_PROGRESS,
        self::STATUS_COMPLETED,
        self::STATUS_DELAYED,
    ];

    public const METADATA_KEYS = [
        'priority',
        'tags',
        'due_date',
        'assignee',
    ];

    public const METADATA_KEYS_TYPES = [
        'priority' => 'string',
        'tags' => 'array',
        'due_date' => 'date',
        'assignee' => 'string',
    ];

    protected $fillable = [
        'project_id',
        'task_id',
        'assigned_by',
        'assigned_at',
        'status',
        'metadata',
    ];

    protected $casts = [
        'assigned_at' => 'datetime',
    ];

    public $timestamps = true;

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function task()
    {
        return $this->belongsTo(Task::class);
    }

    public function assigner()
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }
}

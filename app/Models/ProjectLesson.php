<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectLesson extends Model
{
    /** @use HasFactory<\Database\Factories\ProjectLessonFactory> */
    use HasFactory;

    protected $table = 'project_lessons';

    public const CATEGORIES = [
        'technical', 'schedule', 'cost', 'scope', 'quality',
        'risk', 'stakeholder', 'team', 'process', 'tools', 'other',
    ];

    public const TYPES = ['positive', 'negative', 'observation'];

    public const PHASES = [
        'initiating', 'planning', 'executing',
        'monitoring_controlling', 'closing',
    ];

    protected $fillable = [
        'project_id', 'created_by',
        'title', 'situation', 'impact', 'recommendation',
        'category', 'type', 'phase_captured', 'tags',
    ];

    protected $casts = [
        'tags' => 'array',
    ];

    // ── Relations ─────────────────────────────────────────────────────────────

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}

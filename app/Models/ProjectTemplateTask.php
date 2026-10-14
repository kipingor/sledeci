<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectTemplateTask extends Model
{
    use HasFactory;

    protected $fillable = [
        'template_id',
        'title',
        'description',
        'order',
        'start_day_offset',
        'duration_days',
        'priority',
        'status',
        'checklist',
        'metadata',
    ];

    protected $casts = [
        'checklist' => 'array',
        'metadata' => 'array',
    ];

    /**
     * Get the template this task belongs to.
     */
    public function template(): BelongsTo
    {
        return $this->belongsTo(ProjectTemplate::class, 'template_id');
    }
}

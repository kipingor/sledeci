<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProjectTemplate extends Model
{
    use HasFactory;

    protected $fillable = [
        'created_by',
        'name',
        'description',
        'is_active',
        'is_default',
        'tasks',
        'settings',
        'estimated_duration_days',
    ];

    protected $casts = [
        'settings' => 'array',
        'is_active' => 'boolean',
        'is_default' => 'boolean',
    ];

    /**
     * Get the user who created this template.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the template tasks.
     */
    public function tasks(): HasMany
    {
        return $this->hasMany(ProjectTemplateTask::class, 'template_id');
    }

    /**
     * Scope to get active templates.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to get default template.
     */
    public function scopeDefault($query)
    {
        return $query->where('is_default', true)->where('is_active', true);
    }

    /**
     * Create tasks for a project from this template.
     */
    public function createTasksForProject(Project $project, $triggerable): void
    {
        $startDate = $project->start_date ?? now();
        $ownerId = $project->owner_id;

        foreach ($this->tasks()->orderBy('order')->get() as $templateTask) {
            // Calculate due date based on start_day_offset
            $dueDate = $startDate->copy()->addDays(
                $templateTask->start_day_offset + $templateTask->duration_days
            );

            // Replace variables in title and description
            $title = $this->replaceVariables($templateTask->title, $triggerable);
            $description = $this->replaceVariables($templateTask->description ?? '', $triggerable);

            // Create task
            $project->tasks()->create([
                'title' => $title,
                'description' => $description ?: null,
                'status' => $templateTask->status,
                'priority' => $templateTask->priority,
                'due_date' => $dueDate,
                'assigned_to' => $ownerId,
                'created_by' => $ownerId,
                'order' => $templateTask->order,
                'checklist' => $templateTask->checklist,
            ]);
        }
    }

    /**
     * Replace variables in text with values from the triggerable model.
     */
    protected function replaceVariables(string $text, $model): string
    {
        if (empty($text)) {
            return $text;
        }

        // Replace {lead.field} or {opportunity.field} etc.
        return preg_replace_callback('/\{(\w+)\.(\w+)\}/', function ($matches) use ($model) {
            $modelType = $matches[1];
            $field = $matches[2];

            // Check if this is the right model type
            if ($model instanceof Lead && $modelType === 'lead') {
                return $model->{$field} ?? $matches[0];
            }
            
            if ($model instanceof Opportunity && $modelType === 'opportunity') {
                return $model->{$field} ?? $matches[0];
            }

            return $matches[0];
        }, $text);
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Auth;

class AutomationRule extends Model
{
    use HasFactory;

    protected $fillable = [
        'created_by',
        'name',
        'description',
        'trigger_type',
        'trigger_conditions',
        'action_type',
        'action_config',
        'is_active',
        'execution_count',
        'last_executed_at',
    ];

    protected $casts = [
        'trigger_conditions' => 'array',
        'action_config' => 'array',
        'is_active' => 'boolean',
        'last_executed_at' => 'datetime',
    ];

    /**
     * Get the user who created this rule.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the automation logs for this rule.
     */
    public function logs(): HasMany
    {
        return $this->hasMany(AutomationLog::class);
    }

    /**
     * Scope to get active rules.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to get rules by trigger type.
     */
    public function scopeByTrigger($query, string $triggerType)
    {
        return $query->where('trigger_type', $triggerType);
    }

    /**
     * Check if rule conditions match the trigger data.
     */
    public function matchesConditions(array $data): bool
    {
        if (empty($this->trigger_conditions)) {
            return true;
        }

        foreach ($this->trigger_conditions as $key => $value) {
            if (!isset($data[$key]) || $data[$key] !== $value) {
                return false;
            }
        }

        return true;
    }

    /**
     * Execute the automation action.
     */
    public function execute($triggerable): AutomationLog
    {
        $log = $this->logs()->create([
            'triggerable_type' => get_class($triggerable),
            'triggerable_id' => $triggerable->id,
            'status' => 'processing',
            'payload' => $this->action_config,
            'executed_at' => now(),
        ]);

        try {
            $result = $this->executeAction($triggerable);

            $log->update([
                'status' => 'success',
                'result' => $result,
            ]);

            $this->increment('execution_count');
            $this->update(['last_executed_at' => now()]);

            return $log;
        } catch (\Exception $e) {
            $log->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * Execute the specific action.
     */
    protected function executeAction($triggerable): array
    {
        return match ($this->action_type) {
            'create_project' => $this->createProjectAction($triggerable),
            'send_email' => $this->sendEmailAction($triggerable),
            'create_task' => $this->createTaskAction($triggerable),
            default => throw new \Exception("Unknown action type: {$this->action_type}"),
        };
    }

    /**
     * Create project action.
     */
    protected function createProjectAction($triggerable): array
    {
        $config = $this->action_config;

        // Get template if specified
        $template = null;
        if (isset($config['template_id'])) {
            $template = ProjectTemplate::find($config['template_id']);
        }

        // Prepare project data
        $projectName = $this->replaceVariables(
            $config['name_template'] ?? '{lead.title} - Project',
            $triggerable
        );

        $projectDescription = $this->replaceVariables(
            $config['description_template'] ?? 'Project for {lead.title}',
            $triggerable
        );

        $ownerId = $config['owner_id'] ?? $triggerable->owner_id ?? Auth::id();

        // Create project
        $project = Project::create([
            'name' => $projectName,
            'description' => $projectDescription,
            'owner_id' => $ownerId,
            'created_by' => $ownerId,
            'status' => $config['status'] ?? 'active',
            'start_date' => $config['start_date'] ?? now(),
        ]);

        // Create tasks from template
        if ($template) {
            $template->createTasksForProject($project, $triggerable);
        }

        return [
            'project_id' => $project->id,
            'project_name' => $project->name,
            'tasks_created' => $template ? $template->tasks()->count() : 0,
        ];
    }

    /**
     * Send email action.
     */
    protected function sendEmailAction($triggerable): array
    {
        // TODO: Implement email sending
        return ['email_sent' => true];
    }

    /**
     * Create task action.
     */
    protected function createTaskAction($triggerable): array
    {
        // TODO: Implement task creation
        return ['task_created' => true];
    }

    /**
     * Replace variables in text with actual values.
     */
    protected function replaceVariables(string $text, $model): string
    {
        // Replace {model.field} with actual values
        return preg_replace_callback('/\{(\w+)\.(\w+)\}/', function ($matches) use ($model) {
            $modelName = $matches[1];
            $field = $matches[2];

            // Get the actual model value
            if ($modelName === 'lead' && $model instanceof Lead) {
                return $model->{$field} ?? $matches[0];
            }

            return $matches[0];
        }, $text);
    }
}

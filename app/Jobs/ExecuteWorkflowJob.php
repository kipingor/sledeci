<?php

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use App\Models\Workflow;
use App\Mail\WorkflowEmail;
use App\Models\Lead;
use App\Models\Task;
use Illuminate\Support\Facades\Mail;

class ExecuteWorkflowJob implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public Workflow $workflow,
        public Lead $lead
    ) {}

    /**
     * Execute the job.
     */
    public function handle()
    {
        foreach ($this->workflow->actions as $action) {
            match($action['type']) {
                'send_email' => $this->sendEmail($action),
                'assign_owner' => $this->assignOwner($action),
                'change_status' => $this->changeStatus($action),
                'add_tag' => $this->addTag($action),
                'schedule_task' => $this->scheduleTask($action),
            };
        }

        $this->workflow->increment('run_count');
        $this->workflow->update(['last_run_at' => now()]);
    }

    private function sendEmail($action)
    {
        Mail::to($this->lead->email)->send(
            new WorkflowEmail(
                $action['config']['subject'],
                $action['config']['body'],
                $this->lead
            )
        );
    }

    private function assignOwner($action)
    {
        $this->lead->update([
            'owner_id' => $action['config']['owner_id']
        ]);
    }

    private function changeStatus($action)
    {
        $this->lead->update([
            'status' => $action['config']['status']
        ]);
    }

    private function addTag($action)
    {
        $this->lead->tags()->attach($action['config']['tag']);
    }

    private function scheduleTask($action)
    {
        Task::create([
            'lead_id' => $this->lead->id,
            'title' => $action['config']['title'],
            'due_date' => $action['config']['due_date'],
        ]);
    }
}

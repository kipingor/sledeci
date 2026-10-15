<?php

namespace App\Services;

use App\Models\Task;
use App\Events\TaskUpdated;

class TaskService
{
    public function create(array $data): Task
    {
        $task = Task::create($data);
        return $task;
    }

    public function update(Task $task, array $data): Task
    {
        // Keep completed_at in sync with status on every update path
        if (isset($data['status'])) {
            if ($data['status'] === 'done') {
                $data['completed_at'] = $task->completed_at ?? now()->toDateString();
            } else {
                $data['completed_at'] = null;
            }
        }

        $task->update($data);
        try {
            event(new TaskUpdated($task->fresh()));
        } catch (\Throwable $e) {
            // ignore event failures
        }
        return $task->fresh();
    }

    public function delete(Task $task): void
    {
        $task->delete();
    }

    public function listForProject(int $projectId)
    {
        return \App\Models\Project::findOrFail($projectId)->tasks()->with('assignee:id,name')->get();
    }
}
<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\Task;
use App\Models\TimeLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class TimeLogTest extends TestCase
{
    use RefreshDatabase;

    private function pm(): User
    {
        Role::findOrCreate('project manager', 'web');

        return tap(User::factory()->create())->assignRole('project manager');
    }

    public function test_logging_hours_derives_project_and_generated_duration(): void
    {
        $user = $this->pm();
        $project = Project::factory()->create();
        $task = Task::factory()->create(['project_id' => $project->id]);

        $this->actingAs($user)->post('/time-logs', ['task_id' => $task->id, 'hours' => 1.5, 'notes' => 'Wireframes'])
            ->assertRedirect(route('web.time-logs.index'));

        $log = TimeLog::firstOrFail();
        $this->assertSame($project->id, $log->project_id);
        $this->assertSame($user->id, $log->user_id);
        $this->assertSame(90, (int) $log->duration_minutes);   // generated column, not written by the app
        $this->assertEquals(1.5, (float) $log->hours);
    }

    public function test_api_clients_may_send_duration_minutes_instead_of_hours(): void
    {
        $user = $this->pm();
        $task = Task::factory()->create();

        $this->actingAs($user)->post('/time-logs', ['task_id' => $task->id, 'duration_minutes' => 45])->assertRedirect();

        $this->assertSame(45, (int) TimeLog::firstOrFail()->duration_minutes);
    }

    public function test_requires_a_task_and_a_duration(): void
    {
        $this->actingAs($this->pm())->post('/time-logs', [])->assertSessionHasErrors(['task_id', 'hours']);
    }

    public function test_index_sends_logs_prop_the_page_reads(): void
    {
        $user = $this->pm();
        $task = Task::factory()->create();
        $this->actingAs($user)->post('/time-logs', ['task_id' => $task->id, 'hours' => 1]);

        $this->actingAs($user)->get('/time-logs')->assertInertia(
            fn ($page) => $page->component('time-logs/index')->has('logs.data', 1)->has('totals')
        );
    }
}

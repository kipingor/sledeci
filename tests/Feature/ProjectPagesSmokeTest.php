<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\ProjectStakeholder;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ProjectPagesSmokeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Role::findOrCreate('admin');
    }

    public function test_loads_the_list_pages_whose_ordering_used_MySQL_only_FIELD()
    {

        $user = User::factory()->create();
        $user->assignRole('admin');

        $this->actingAs($user)->get(route('web.projects.index'))->assertOk();
    }

    public function test_saves_the_stakeholder_engagement_strategy_sent_by_the_form()
    {

        $user = User::factory()->create();
        $user->assignRole('admin');

        $project = Project::factory()->create();

        $this->actingAs($user)
            ->post(route('web.projects.stakeholders.store', $project), [
                'name'                => 'Jane Doe',
                'influence'           => 'high',
                'interest'            => 'medium',
                'current_engagement'  => 'neutral',
                'desired_engagement'  => 'supportive',
                'engagement_strategy' => 'Monthly one-to-one',
            ])
            ->assertRedirect();

        expect(ProjectStakeholder::where('project_id', $project->id)->first())
            ->engagement_strategy->toBe('Monthly one-to-one')
            ->has_engagement_gap->toBeTrue();
    }

    public function test_renders_the_project_page_with_stakeholders_ordered_by_influence()
    {
        $user = User::factory()->create();
        $user->assignRole('admin');

        $project = Project::factory()->create();

        foreach (['low' => 'Low One', 'high' => 'High One', 'medium' => 'Mid One'] as $influence => $name) {
            ProjectStakeholder::create([
                'project_id' => $project->id, 'name' => $name, 'influence' => $influence,
                'interest' => 'high', 'current_engagement' => 'neutral', 'desired_engagement' => 'neutral',
            ]);
        }

        $this->actingAs($user)->get(route('web.projects.show', $project))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('projects/show')
                ->where('project.stakeholders.0.name', 'High One')
                ->where('project.stakeholders.2.name', 'Low One'));
    }
}

<?php

use App\Models\Project;
use App\Models\ProjectStakeholder;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->admin = User::factory()->create();
    $this->admin->assignRole('admin');
});

it('loads the list pages whose ordering used MySQL-only FIELD()', function (string $routeName) {
    $this->actingAs($this->admin)->get(route($routeName))->assertOk();
})->with(['web.projects.index', 'web.milestones.index', 'web.tenders.index']);

it('saves the stakeholder engagement strategy sent by the form', function () {
    $project = Project::factory()->create();

    $this->actingAs($this->admin)
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
});

it('renders the project page with stakeholders ordered by influence', function () {
    $project = Project::factory()->create();

    foreach (['low' => 'Low One', 'high' => 'High One', 'medium' => 'Mid One'] as $influence => $name) {
        ProjectStakeholder::create([
            'project_id' => $project->id, 'name' => $name, 'influence' => $influence,
            'interest' => 'high', 'current_engagement' => 'neutral', 'desired_engagement' => 'neutral',
        ]);
    }

    $this->actingAs($this->admin)->get(route('web.projects.show', $project))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('projects/show')
            ->where('project.stakeholders.0.name', 'High One')
            ->where('project.stakeholders.2.name', 'Low One'));
});

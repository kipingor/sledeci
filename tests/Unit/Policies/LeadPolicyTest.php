<?php

namespace Tests\Unit\Policies;

use Tests\TestCase;
use App\Models\User;
use App\Models\Lead;
use App\Policies\LeadPolicy;
use Illuminate\Foundation\Testing\RefreshDatabase;

class LeadPolicyTest extends TestCase
{
    use RefreshDatabase;

    protected LeadPolicy $policy;

    protected function setUp(): void
    {
        parent::setUp();
        $this->policy = new LeadPolicy();
    }

    public function test_owner_can_view_lead(): void
    {
        $user = User::factory()->create();
        $lead = Lead::factory()->create([
            'owner_id' => $user->id,
            'created_by' => User::factory()->create()->id,
        ]);

        $this->assertTrue(
            $this->policy->view($user, $lead)
        );
    }

    public function test_non_owner_cannot_view_lead(): void
    {
        $user = User::factory()->create();
        $lead = Lead::factory()->create([
            'owner_id' => User::factory()->create()->id,
            'created_by' => User::factory()->create()->id,
        ]);

        $this->assertFalse(
            $this->policy->view($user, $lead)
        );
    }

    public function test_owner_can_update_lead(): void
    {
        $user = User::factory()->create();
        $lead = Lead::factory()->create([
            'owner_id' => $user->id,
            'created_by' => User::factory()->create()->id,
        ]);

        $this->assertTrue(
            $this->policy->update($user, $lead)
        );
    }

    public function test_non_owner_cannot_update_lead(): void
    {
        $user = User::factory()->create();
        $lead = Lead::factory()->create([
            'owner_id' => User::factory()->create()->id,
            'created_by' => User::factory()->create()->id,
        ]);

        $this->assertFalse(
            $this->policy->update($user, $lead)
        );
    }

    public function test_owner_can_delete_lead(): void
    {
        $user = User::factory()->create();
        $lead = Lead::factory()->create([
            'owner_id' => $user->id,
            'created_by' => User::factory()->create()->id,
        ]);

        $this->assertTrue(
            $this->policy->delete($user, $lead)
        );
    }

    public function test_non_owner_cannot_delete_lead(): void
    {
        $user = User::factory()->create();
        $lead = Lead::factory()->create([
            'owner_id' => User::factory()->create()->id,
            'created_by' => User::factory()->create()->id,
        ]);

        $this->assertFalse(
            $this->policy->delete($user, $lead)
        );
    }
}

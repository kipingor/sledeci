<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use App\Services\Lead\LeadService;
use App\Events\LeadCreated;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class LeadServiceEventTest extends TestCase
{
    use RefreshDatabase;

    public function test_create_dispatches_event()
    {
        Event::fake([LeadCreated::class]);

        $user = User::factory()->create();

        $service = new LeadService();
        $lead = $service->create([
            'title' => 'Test Lead',
            'type' => 'conversation',
            'created_by' => $user->id,
        ]);

        Event::assertDispatched(LeadCreated::class);
        $this->assertDatabaseHas('leads', ['title' => 'Test Lead']);
    }
}

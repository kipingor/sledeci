<?php

namespace Tests\Feature;

use App\Models\Lead;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LeadRoutesTest extends TestCase
{
    use RefreshDatabase;

    public function test_statistics_route_is_accessible()
    {
        $user = User::factory()->create();
        $user->assignRole('admin');

        Sanctum::actingAs(
            $user,
            ['*'],
        );

        $response = $this->getJson('/api/v1/leads/statistics');

        $response->assertJsonStructure([
            'success',
            'data' => [
                'total',
                'by_status',
                'by_stage',
            ],
        ]);
    }

    public function test_single_lead_route_still_works()
    {
        $user = User::factory()->create();
        $user->assignRole('sales');
        Sanctum::actingAs($user, ['*']);

        $lead = Lead::factory()->create();

        $response = $this->getJson("/api/v1/leads/{$lead->id}");

        $response->assertJson([
            'success' => true,
            'data' => [
                'id' => $lead->id,
            ],
        ]);
    }

    public function test_bulk_routes_are_registered()
    {
        // Check that bulk routes exist
        $routes = collect(Route::getRoutes())->filter(function ($route) {
            return str_contains($route->uri(), 'api/v1/leads/bulk');
        });

        $this->assertGreaterThan(0, $routes->count());
    }
}

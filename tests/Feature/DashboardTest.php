<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;
use App\Models\User;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Role::findOrCreate('admin');
    }

    public function test_guests_are_redirected_to_the_login_page()
    {
        $response = $this->get(route('web.dashboard'));
        $response->assertRedirect(route('login'));
    }

    public function test_authenticated_users_can_visit_the_dashboard()
    {
        $user = User::factory()->create();
        $user->assignRole('admin');

        $this->actingAs($user);

        $response = $this->get(route('web.dashboard'));
        $response->assertOk();
    }
}

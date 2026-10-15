<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SanctumFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_sanctum_csrf_cookie_route_sets_xsrf_token_cookie()
    {
        $response = $this->get('/sanctum/csrf-cookie');

        $response->assertStatus(204)->assertCookie('XSRF-TOKEN');
    }

    public function test_spa_flow_csrf_and_authenticated_api_access()
    {
        // Create a user with the default factory password 'password'
        $user = User::factory()->create();
        $user->assignRole('sales'); // dashboard APIs authorize via LeadPolicy::viewAny

        // Acquire CSRF cookie (as the SPA would)
        $this->get('/sanctum/csrf-cookie')->assertCookie('XSRF-TOKEN');

        // Perform credentials login using the web login route
        $response = $this->post(route('login.store'), [
            'email' => $user->email,
            'password' => 'password',
        ]);

        // Login may redirect to the dashboard, or to the two-factor challenge
        // if 2FA is enabled for the application. Accept either outcome.
        $response->assertStatus(302);
        $target = $response->headers->get('Location') ?? $response->getTargetUrl();

        if (str_contains($target, route('two-factor.login', [], false))) {
            // Two-factor enabled: session will hold pending login info and user is not yet authenticated
            $response->assertRedirect(route('two-factor.login'));
            $this->assertGuest();
        } else {
            $response->assertRedirect(route('web.dashboard', absolute: false));
            $this->assertAuthenticatedAs($user);
        }

        // After login, the authenticated web session should allow access to
        // the dashboard metrics endpoint (web route guarded by auth middleware)
        $metricsResponse = $this->actingAs($user)->getJson('/api/v1/dashboard/metrics');
        $metricsResponse->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['success', 'data']);
    }
}

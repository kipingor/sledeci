<?php

namespace Tests\Feature;

use App\Models\CompanySetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AiSettingsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Role::findOrCreate('admin');
    }

    public function test_ai_settings_page_renders_for_authenticated_user(): void
    {
        $user = User::factory()->create();
        $user->assignRole('admin');

        CompanySetting::current();

        $this->actingAs($user)
            ->get(route('settings.ai'))
            ->assertOk();
    }

    public function test_user_can_update_preferred_provider(): void
    {
        $user = User::factory()->create();
        $user->assignRole('admin');
        CompanySetting::current();

        $this->actingAs($user)
            ->patch(route('settings.ai.update'), [
                'ai_provider' => 'gemini',
            ])
            ->assertRedirect();

        $this->assertSame('gemini', CompanySetting::current()->fresh()->ai_provider);
    }

    public function test_local_subscribe_activates_plan_without_stripe(): void
    {
        config(['services.stripe.secret' => null]);

        $user = User::factory()->create();
        $user->assignRole('admin');
        CompanySetting::current();

        $this->actingAs($user)
            ->post(route('settings.ai.subscribe'), ['plan' => 'starter'])
            ->assertRedirect();

        $settings = CompanySetting::current()->fresh();
        $this->assertSame('starter', $settings->ai_plan);
        $this->assertSame('active', $settings->ai_subscription_status);
    }
}

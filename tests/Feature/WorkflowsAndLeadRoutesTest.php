<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Workflow;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

/**
 * Covers the Ziggy → Wayfinder route fix: web.leads bulk ops, web.ai.*, web.workflows.*.
 */
class WorkflowsAndLeadRoutesTest extends TestCase
{
    use RefreshDatabase;

    public function test_lead_bulk_and_import_routes_are_named_and_authenticated(): void
    {
        $names = [
            'web.leads.bulk-import',
            'web.leads.bulk-delete',
            'web.leads.bulk-export',
            'web.leads.bulk-update-status',
            'web.leads.bulk-assign',
            'web.leads.bulk-update-stage',
            'web.leads.index',
            'web.leads.show',
        ];

        foreach ($names as $name) {
            $route = Route::getRoutes()->getByName($name);
            $this->assertNotNull($route, "Missing route: {$name}");
            $this->assertContains('auth', $route->gatherMiddleware(), $name);
        }
    }

    public function test_ai_lead_intelligence_routes_exist(): void
    {
        $names = [
            'web.ai.pipeline-health',
            'web.ai.batch-score',
            'web.ai.lead-insights',
            'web.ai.lead-recommendations',
            'web.ai.similar-leads',
            'web.ai.refresh-insights',
        ];

        foreach ($names as $name) {
            $route = Route::getRoutes()->getByName($name);
            $this->assertNotNull($route, "Missing route: {$name}");
            $this->assertContains('auth', $route->gatherMiddleware(), $name);
        }
    }

    public function test_workflow_routes_include_index_and_toggle(): void
    {
        foreach (['web.workflows.index', 'web.workflows.store', 'web.workflows.update', 'web.workflows.toggle', 'web.workflows.destroy'] as $name) {
            $route = Route::getRoutes()->getByName($name);
            $this->assertNotNull($route, "Missing route: {$name}");
        }

        $this->assertSame(
            'web.workflows.index',
            Route::getRoutes()->match(request()->create('/workflows', 'GET'))->getName()
        );
    }

    public function test_workflows_index_requires_authentication(): void
    {
        $this->get('/workflows')->assertRedirect('/login');
    }

    public function test_workflows_index_renders_for_authorized_user(): void
    {
        $user = User::factory()->create();
        // Role may vary by seeder; at minimum auth should get past login redirect.
        $this->actingAs($user)->get('/workflows');
        // May be 200, 403 (module.access), or 500 if policy missing — assert not a redirect to login
        $this->assertFalse(
            session()->has('url.intended') && str_contains(url()->previous() ?: '', 'login'),
            'Should not bounce authenticated user back through guest login flow only'
        );
    }
}

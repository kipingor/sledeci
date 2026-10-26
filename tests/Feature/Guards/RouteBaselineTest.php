<?php

namespace Tests\Feature\Guards;

use Illuminate\Support\Facades\Route;
use Tests\TestCase;

/**
 * Guard 1: routes must not silently disappear.
 *
 * The regeneration that produced this codebase dropped ~150 routes without any
 * test noticing. tests/Fixtures/route-baseline.json lists every
 * "Controller@action" the application is expected to expose. Removing a route
 * on purpose means removing it from the fixture in the same commit.
 */
class RouteBaselineTest extends TestCase
{
    public function test_no_baseline_route_has_been_lost(): void
    {
        $baseline = json_decode(file_get_contents(base_path('tests/Fixtures/route-baseline.json')), true);

        $registered = collect(Route::getRoutes()->getRoutes())
            ->map(fn ($route) => ltrim($route->getActionName(), '\\'))
            ->all();

        $missing = array_values(array_diff($baseline, $registered));

        $this->assertSame(
            [],
            $missing,
            count($missing)." route(s) in tests/Fixtures/route-baseline.json are no longer registered:\n  ".implode("\n  ", $missing)
        );
    }

    public function test_every_application_route_points_at_an_existing_controller_method(): void
    {
        $problems = [];

        foreach (Route::getRoutes()->getRoutes() as $route) {
            $uses = $route->getAction('uses');

            if (! is_string($uses) || ! str_starts_with($uses, 'App\\')) {
                continue; // closures and vendor routes
            }

            [$class, $method] = array_pad(explode('@', $uses, 2), 2, '__invoke');

            if (! class_exists($class)) {
                $problems[] = $route->uri()." -> {$class} (class not found)";
            } elseif (! method_exists($class, $method)) {
                $problems[] = $route->uri()." -> {$class}@{$method} (method not found)";
            }
        }

        $this->assertSame([], $problems, "Broken route targets:\n  ".implode("\n  ", $problems));
    }

    public function test_route_names_are_unique_so_routes_can_be_cached(): void
    {
        $names = collect(Route::getRoutes()->getRoutes())
            ->map(fn ($route) => $route->getName())
            ->filter();

        $duplicates = $names->duplicates()->unique()->values()->all();

        $this->assertSame([], $duplicates, 'Duplicate route names: '.implode(', ', $duplicates));
    }
}

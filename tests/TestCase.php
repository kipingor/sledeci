<?php

namespace Tests;

use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Laravel\Fortify\Features;
use Spatie\Permission\PermissionRegistrar;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        $this->guardAgainstNonTestDatabase();

        // Tests must not depend on a compiled frontend (public/build/manifest.json).
        $this->withoutVite();

        // Role-less users are denied by EnforceModuleAccess, so every database-backed
        // test starts with the application's roles (config/access.php) in place.
        if (in_array(RefreshDatabase::class, class_uses_recursive(static::class), true)) {
            $this->seed(RoleSeeder::class);
            app(PermissionRegistrar::class)->forgetCachedPermissions();
        }
    }

    /**
     * RefreshDatabase drops every table. Refuse to run if the configured database
     * does not look like a throw-away test database (e.g. a developer's .env was
     * loaded instead of phpunit.xml).
     */
    private function guardAgainstNonTestDatabase(): void
    {
        $connection = config('database.default');
        $database = (string) config("database.connections.{$connection}.database");

        if ($database === ':memory:' || str_contains(strtolower($database), 'test')) {
            return;
        }

        throw new \RuntimeException(
            "Refusing to run tests against database '{$database}' ({$connection}). "
            .'Set DB_DATABASE to a name containing "test" (phpunit.xml uses sledeci_test).'
        );
    }

    protected function skipUnlessFortifyHas(string $feature, ?string $message = null): void
    {
        if (! Features::enabled($feature)) {
            $this->markTestSkipped($message ?? "Fortify feature [{$feature}] is not enabled.");
        }
    }
}

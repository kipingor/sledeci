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

        // Tests must not depend on a compiled frontend (public/build/manifest.json).
        $this->withoutVite();

        // Role-less users are denied by EnforceModuleAccess, so every database-backed
        // test starts with the application's roles (config/access.php) in place.
        if (in_array(RefreshDatabase::class, class_uses_recursive(static::class), true)) {
            $this->seed(RoleSeeder::class);
            app(PermissionRegistrar::class)->forgetCachedPermissions();
        }
    }

    protected function skipUnlessFortifyHas(string $feature, ?string $message = null): void
    {
        if (! Features::enabled($feature)) {
            $this->markTestSkipped($message ?? "Fortify feature [{$feature}] is not enabled.");
        }
    }
}

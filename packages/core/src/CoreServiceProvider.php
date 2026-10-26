<?php

namespace Sledeci\Core;

use Illuminate\Support\ServiceProvider;
use Sledeci\Core\Contracts\ClientFinancialSummary;
use Sledeci\Core\Fallbacks\NullClientFinancialSummary;
use Sledeci\Core\Modules\ModuleRegistry;

class CoreServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__.'/../config/sledeci.php', 'sledeci');

        $this->app->singletonIf(ModuleRegistry::class, fn () => new ModuleRegistry);

        // Soft dependencies: packages work without their optional partners.
        // The accounting package (or the host) overrides this binding.
        $this->app->bindIf(ClientFinancialSummary::class, NullClientFinancialSummary::class);
    }

    public function boot(): void
    {
        $this->publishes([
            __DIR__.'/../config/sledeci.php' => config_path('sledeci.php'),
        ], 'sledeci-config');
    }
}

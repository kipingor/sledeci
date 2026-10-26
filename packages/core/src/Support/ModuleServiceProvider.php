<?php

namespace Sledeci\Core\Support;

use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;
use ReflectionClass;
use Sledeci\Core\Modules\Module;
use Sledeci\Core\Modules\ModuleRegistry;

/**
 * Base class every module package extends. It gives all packages identical wiring:
 *
 *  - routes/web.php is loaded inside the same group the host uses
 *    (web, auth, verified, module.access; names prefixed "web.");
 *  - database/migrations is loaded;
 *  - policies are registered explicitly (auto-discovery cannot find policies
 *    that live outside App\Policies);
 *  - the module is recorded in the ModuleRegistry.
 *
 * Packages override module() and, when needed, policies().
 */
abstract class ModuleServiceProvider extends ServiceProvider
{
    abstract protected function module(): Module;

    /**
     * @return array<class-string, class-string> model => policy
     */
    protected function policies(): array
    {
        return [];
    }

    /**
     * Absolute path inside the package (the directory holding src/).
     */
    protected function packagePath(string $path = ''): string
    {
        $root = dirname((new ReflectionClass(static::class))->getFileName(), 2);

        return $path === '' ? $root : $root.DIRECTORY_SEPARATOR.ltrim($path, '/\\');
    }

    public function register(): void
    {
        $this->app->singletonIf(ModuleRegistry::class, fn () => new ModuleRegistry);
        $this->app->make(ModuleRegistry::class)->add($this->module());
    }

    public function boot(): void
    {
        $this->mergeDefaultRoles();

        if (is_dir($migrations = $this->packagePath('database/migrations'))) {
            $this->loadMigrationsFrom($migrations);
        }

        $this->registerPagePath();

        foreach ($this->policies() as $model => $policy) {
            Gate::policy($model, $policy);
        }

        $this->registerRoutes();
    }

    /**
     * Inertia's test helpers check that a page file exists. Package pages live
     * outside resources/js/pages, so tell Inertia where to look.
     */
    private function registerPagePath(): void
    {
        $pages = $this->packagePath('resources/js/pages');

        if (is_dir($pages)) {
            config(['inertia.testing.page_paths' => array_values(array_unique([
                ...config('inertia.testing.page_paths', [resource_path('js/pages')]),
                $pages,
            ]))]);
        }
    }

    protected function registerRoutes(): void
    {
        $routes = $this->packagePath('routes/web.php');

        if ($this->app->routesAreCached() || ! is_file($routes)) {
            return;
        }

        Route::middleware(config('sledeci.web_middleware', ['web', 'auth', 'verified', 'module.access']))
            ->name(config('sledeci.route_name_prefix', 'web.'))
            ->group($routes);
    }

    /**
     * Fill in default roles for route modules the host config does not define.
     */
    private function mergeDefaultRoles(): void
    {
        $host = config('access.modules', []);

        foreach ($this->module()->routeModules as $routeModule) {
            if (! array_key_exists($routeModule, $host)) {
                $host[$routeModule] = $this->module()->roles;
            }
        }

        config(['access.modules' => $host]);
    }
}

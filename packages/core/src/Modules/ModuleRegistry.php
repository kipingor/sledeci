<?php

namespace Sledeci\Core\Modules;

/**
 * Every installed package registers a Module here. The registry is the single
 * source for "which modules exist", so installing or removing a package changes
 * access rules and navigation without editing host files.
 *
 * Host configuration always wins: roles are merged into config('access.modules')
 * only for keys the host has not defined itself.
 */
class ModuleRegistry
{
    /** @var array<string, Module> */
    private array $modules = [];

    public function add(Module $module): void
    {
        $this->modules[$module->key] = $module;
    }

    public function has(string $key): bool
    {
        return isset($this->modules[$key]);
    }

    public function get(string $key): ?Module
    {
        return $this->modules[$key] ?? null;
    }

    /**
     * @return array<string, Module>
     */
    public function all(): array
    {
        return $this->modules;
    }

    /**
     * Default role map for module keys that config/access.php does not define.
     *
     * @return array<string, list<string>|null>
     */
    public function defaultRoles(): array
    {
        $roles = [];

        foreach ($this->modules as $module) {
            foreach ($module->routeModules as $routeModule) {
                $roles[$routeModule] = $module->roles;
            }
        }

        return $roles;
    }

    /**
     * Navigation items the given role names may see, grouped by module.
     *
     * @param  list<string>  $roleNames
     * @return list<array{module: string, label: string, items: list<array{title: string, href: string, icon?: string}>}>
     */
    public function navigationFor(array $roleNames, bool $isAdmin = false): array
    {
        $out = [];

        foreach ($this->modules as $module) {
            if ($module->navigation === []) {
                continue;
            }

            $visible = $isAdmin || $module->roles === null || array_intersect($roleNames, $module->roles) !== [];

            if ($visible) {
                $out[] = ['module' => $module->key, 'label' => $module->label, 'items' => $module->navigation];
            }
        }

        return $out;
    }
}

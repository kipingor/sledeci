<?php

namespace Sledeci\Core\Modules;

/**
 * Describes one module (package) of the suite.
 *
 * `routeModules` are the keys used in config/access.php, which are the first
 * segment of a route name after "web." (for example "clients" for
 * "web.clients.index"). A package that serves several route prefixes lists them
 * all, and they share the same default roles.
 */
final class Module
{
    /**
     * @param  list<string>  $routeModules  config/access.php keys this module owns
     * @param  list<string>|null  $roles  default roles; null means any authenticated role
     * @param  list<array{title: string, href: string, icon?: string}>  $navigation
     */
    public function __construct(
        public readonly string $key,
        public readonly string $label,
        public readonly array $routeModules,
        public readonly ?array $roles = null,
        public readonly array $navigation = [],
    ) {}
}

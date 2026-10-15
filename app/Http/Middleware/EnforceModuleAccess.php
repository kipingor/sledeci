<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Central, config-driven authorization for every authenticated web/API route.
 * See config/access.php for the map. Runs after authentication; guests (and
 * public token routes that skip auth) are passed through untouched.
 */
class EnforceModuleAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return $next($request); // authentication middleware decides
        }

        $name = $request->route()?->getName();

        // Only named web.* / api.* routes are governed here.
        if (! $name || ! preg_match('/^(?:web|api)\.([^.]+)/', $name, $m)) {
            return $next($request);
        }

        $module = $m[1];

        if ($user->hasRole(config('access.admin_role', 'admin'))) {
            return $next($request);
        }

        if (in_array($module, config('access.open', []), true)) {
            return $next($request);
        }

        $userRoles = $user->getRoleNames()->all();

        if ($userRoles === []) {
            abort(403, 'Your account has no role assigned. Contact an administrator.');
        }

        $modules = config('access.modules', []);
        $allowed = array_key_exists($module, $modules) ? $modules[$module] : null; // null => any role

        if ($allowed !== null) {
            $matching = array_values(array_intersect($userRoles, $allowed));

            if ($matching === []) {
                abort(403, 'You do not have access to this module.');
            }

            // Read-only roles may not modify data — unless they also hold a writing role.
            $readOnly = config('access.read_only_roles', []);
            $canWrite = array_diff($matching, $readOnly) !== [];

            if (! $canWrite && ! $request->isMethodSafe()) {
                abort(403, 'Your role has read-only access to this module.');
            }
        }

        return $next($request);
    }
}

<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;
use App\Models\AuditLog;

/**
 * FIXES:
 * - Added try-catch around logging to prevent middleware from breaking requests if logging fails.
 * - Excluded more routes (Horizon, Telescope, Debugbar, Sanctum) from logging to reduce noise and avoid issues with non-standard responses.
 * - Used fnmatch for flexible route pattern matching instead of exact matches.
 * - Added comments for clarity.
 */
class LogUserActivity
{
    private const EXCLUDED_PATTERNS = [
        'horizon.*', 'telescope.*', '_debugbar.*',
        'web.dashboard.metrics', 'web.dashboard.clear-cache', 'sanctum.*',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if (Auth::check()) {
            $this->maybeLog($request, $response);
        }

        return $response;
    }

    private function maybeLog(Request $request, Response $response): void
    {
        if (!in_array($request->method(), ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
            return;
        }

        $status = $response->getStatusCode();
        if ($status < 200 || $status >= 300) {
            return;
        }

        $routeName = $request->route()?->getName() ?? '';
        foreach (self::EXCLUDED_PATTERNS as $pattern) {
            if (fnmatch($pattern, $routeName)) {
                return;
            }
        }

        try {
            $segments = explode('/', trim($request->path(), '/'));
            $resource = $segments[0] ?? 'unknown';
            $method   = $request->method();

            $event = match ($method) {
                'POST'         => "{$resource}.created",
                'PUT', 'PATCH' => "{$resource}.updated",
                'DELETE'       => "{$resource}.deleted",
                default        => 'action',
            };

            AuditLog::create([
                'user_id'        => Auth::id(),
                'event'          => $event,
                'auditable_type' => null,
                'auditable_id'   => null,
                'old_values'     => null,
                'new_values'     => null,
                'ip_address'     => $request->ip(),
                'user_agent'     => $request->userAgent(),
            ]);
        } catch (\Throwable $e) {
            Log::warning('LogUserActivity: failed to write audit log', [
                'error'   => $e->getMessage(),
                'user_id' => Auth::id(),
                'path'    => $request->path(),
            ]);
        }
    }
}
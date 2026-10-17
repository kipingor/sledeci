<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Closes the public /register endpoints when fortify.registration_enabled is false.
 * GET /register  -> 404 (page does not exist)   POST /register -> 403
 */
class EnsureRegistrationEnabled
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! config('fortify.registration_enabled', true) && $request->is('register')) {
            abort($request->isMethod('GET') || $request->isMethod('HEAD') ? 404 : 403);
        }

        return $next($request);
    }
}

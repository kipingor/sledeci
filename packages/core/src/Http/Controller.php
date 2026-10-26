<?php

namespace Sledeci\Core\Http;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Foundation\Validation\ValidatesRequests;
use Illuminate\Routing\Controller as BaseController;
use Illuminate\Support\Facades\Gate;

/**
 * Base controller for module packages. Mirrors the host's App\Http\Controllers\Controller
 * (including the can()/cannot() helpers) so moved controllers behave identically
 * without importing anything from the host application.
 */
abstract class Controller extends BaseController
{
    use AuthorizesRequests, ValidatesRequests;

    /**
     * Determine if the authenticated user has a given ability.
     *
     * @param  mixed  $arguments  Model instance, class-string, or array
     */
    public function can(string $ability, mixed $arguments = []): bool
    {
        return Gate::allows($ability, $arguments);
    }

    /**
     * Determine if the authenticated user lacks a given ability.
     */
    public function cannot(string $ability, mixed $arguments = []): bool
    {
        return Gate::denies($ability, $arguments);
    }
}

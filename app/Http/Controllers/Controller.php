<?php

namespace App\Http\Controllers;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Foundation\Validation\ValidatesRequests;
use Illuminate\Routing\Controller as BaseController;
use Illuminate\Support\Facades\Gate;

abstract class Controller extends BaseController
{
    use AuthorizesRequests, ValidatesRequests;

    /**
     * Determine if the currently authenticated user has a given ability.
     *
     * Proxies to Gate::allows() so this mirrors the behaviour of
     * $user->can() on the User model, but callable as $this->can()
     * from any controller method.
     *
     * @param  mixed  $arguments  Model instance, class-string, or array
     */
    public function can(string $ability, mixed $arguments = []): bool
    {
        return Gate::allows($ability, $arguments);
    }

    /**
     * Determine if the currently authenticated user lacks a given ability.
     */
    public function cannot(string $ability, mixed $arguments = []): bool
    {
        return Gate::denies($ability, $arguments);
    }
}

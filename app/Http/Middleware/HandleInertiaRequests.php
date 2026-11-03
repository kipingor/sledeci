<?php

namespace App\Http\Middleware;

use App\Models\CompanySetting;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $request->user()?->loadMissing('roles'),
            ],
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
                'importResult' => fn () => $request->session()->get('importResult'),
                'bulkResult' => fn () => $request->session()->get('bulkResult'),
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'brand' => function () {
                try {
                    return CompanySetting::current()->brandPalette();
                } catch (\Throwable) {
                    return [
                        'primary' => config('company.brand_color'),
                        'secondary' => config('company.brand_dark'),
                        'accent' => null,
                        'logo_url' => null,
                        'theme_from_logo' => true,
                    ];
                }
            },
        ];
    }
}

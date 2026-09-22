<?php

namespace App\Http\Controllers\Dashboard;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $tenant = tenancy()->initialized ? tenancy()->tenant : null;

        return Inertia::render('dashboard/index', [
            'tenant' => $tenant ? [
                'name' => $tenant->name,
                'plan' => $tenant->plan,
            ] : null,
        ]);
    }
}

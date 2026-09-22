<?php

namespace App\Http\Controllers\Central;

use App\Http\Requests\StoreTenantRequest;
use App\Models\Tenant;
use App\Services\TenantProvisioningService;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;
use App\Http\Controllers\Controller;

class TenantController extends Controller
{
    public function __construct(
        private readonly TenantProvisioningService $provisioning,
    ) {}

    public function index(): Response
    {
        $tenants = Tenant::withoutGlobalScopes()
            ->with('domains')
            ->latest()
            ->paginate(25);

        return Inertia::render('Central/Tenants/Index', [
            'tenants' => $tenants,
            'stats'   => [
                'total'     => Tenant::withoutGlobalScopes()->count(),
                'active'    => Tenant::withoutGlobalScopes()->where('status', 'active')->count(),
                'trial'     => Tenant::withoutGlobalScopes()->where('status', 'trial')->count(),
                'suspended' => Tenant::withoutGlobalScopes()->where('status', 'suspended')->count(),
            ],
        ]);
    }

    public function show(Tenant $tenant): Response
    {
        $tenant->load('domains');

        return Inertia::render('Central/Tenants/Show', [
            'tenant' => $tenant,
        ]);
    }

    public function store(StoreTenantRequest $request): RedirectResponse
    {
        $this->provisioning->provision($request->validated());

        return redirect()->route('central.tenants.index')
            ->with('success', 'Tenant provisioned successfully.');
    }

    public function suspend(Tenant $tenant): RedirectResponse
    {
        $this->provisioning->suspend($tenant);

        return back()->with('success', "Tenant {$tenant->name} has been suspended.");
    }

    public function activate(Tenant $tenant): RedirectResponse
    {
        $this->provisioning->activate($tenant);

        return back()->with('success', "Tenant {$tenant->name} is now active.");
    }

    public function destroy(Tenant $tenant): RedirectResponse
    {
        $this->provisioning->delete($tenant);

        return redirect()->route('central.tenants.index')
            ->with('success', 'Tenant deleted.');
    }
}

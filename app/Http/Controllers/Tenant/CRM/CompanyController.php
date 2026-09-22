<?php

namespace App\Http\Controllers\Tenant\CRM;

use App\Http\Controllers\Controller;
use App\Http\Requests\CRM\StoreCompanyRequest;
use App\Http\Requests\CRM\UpdateCompanyRequest;
use App\Models\Company;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CompanyController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Company::with('owner')
            ->withCount(['contacts', 'deals'])
            ->when($request->input('search'), fn ($q, $s) =>
                $q->where('name', 'ilike', "%{$s}%")
                  ->orWhere('email', 'ilike', "%{$s}%")
            )
            ->latest();

        return Inertia::render('CRM/Companies/Index', [
            'companies'   => $query->paginate(20)->withQueryString(),
            'filters'     => $request->only(['search']),
            'teamMembers' => User::select('id', 'name')->get(),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('CRM/Companies/Form', [
            'teamMembers' => User::select('id', 'name')->get(),
            'industries'  => [
                'Technology', 'Finance', 'Healthcare', 'Agriculture',
                'Retail', 'Manufacturing', 'Education', 'Logistics', 'Other',
            ],
        ]);
    }

    public function store(StoreCompanyRequest $request): RedirectResponse
    {
        Company::create([
            ...$request->validated(),
            'owner_id' => $request->validated('owner_id') ?? auth()->id(),
        ]);

        return redirect()->route('companies.index')
            ->with('success', 'Company created successfully.');
    }

    public function show(Company $company): Response
    {
        $company->load(['owner', 'contacts.owner', 'deals.owner']);

        return Inertia::render('CRM/Companies/Show', [
            'company' => $company,
        ]);
    }

    public function edit(Company $company): Response
    {
        return Inertia::render('CRM/Companies/Form', [
            'company'     => $company,
            'teamMembers' => User::select('id', 'name')->get(),
            'industries'  => [
                'Technology', 'Finance', 'Healthcare', 'Agriculture',
                'Retail', 'Manufacturing', 'Education', 'Logistics', 'Other',
            ],
        ]);
    }

    public function update(UpdateCompanyRequest $request, Company $company): RedirectResponse
    {
        $company->update($request->validated());

        return redirect()->route('companies.show', $company)
            ->with('success', 'Company updated successfully.');
    }

    public function destroy(Company $company): RedirectResponse
    {
        $company->delete();

        return redirect()->route('companies.index')
            ->with('success', 'Company deleted.');
    }
}

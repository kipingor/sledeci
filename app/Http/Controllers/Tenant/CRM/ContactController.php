<?php

namespace App\Http\Controllers\Tenant\CRM;

use App\Http\Controllers\Controller;
use App\Http\Requests\CRM\StoreContactRequest;
use App\Http\Requests\CRM\UpdateContactRequest;
use App\Models\Company;
use App\Models\Contact;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ContactController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Contact::with(['company', 'owner'])
            ->when($request->input('search'), fn ($q, $s) =>
                $q->where(fn ($q2) =>
                    $q2->where('first_name', 'ilike', "%{$s}%")
                       ->orWhere('last_name', 'ilike', "%{$s}%")
                       ->orWhere('email', 'ilike', "%{$s}%")
                       ->orWhere('phone', 'ilike', "%{$s}%")
                )
            )
            ->when($request->input('stage'), fn ($q, $stage) => $q->where('stage', $stage))
            ->when($request->input('owner_id'), fn ($q, $id) => $q->where('owner_id', $id))
            ->latest();

        return Inertia::render('crm/contacts/index', [
            'contacts'  => $query->paginate(20)->withQueryString(),
            'stages'    => ['lead', 'prospect', 'customer', 'churned'],
            'filters'   => $request->only(['search', 'stage', 'owner_id']),
            'teamMembers' => User::select('id', 'name')->get(),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('crm/contacts/form', [
            'companies'   => Company::select('id', 'name')->orderBy('name')->get(),
            'teamMembers' => User::select('id', 'name')->get(),
            'stages'      => ['lead', 'prospect', 'customer', 'churned'],
            'sources'     => ['website', 'referral', 'social', 'email', 'phone', 'event', 'other'],
        ]);
    }

    public function store(StoreContactRequest $request): RedirectResponse
    {
        Contact::create([
            ...$request->validated(),
            'owner_id' => $request->validated('owner_id') ?? auth()->id(),
        ]);

        return redirect()->route('contacts.index')
            ->with('success', 'Contact created successfully.');
    }

    public function show(Contact $contact): Response
    {
        $contact->load(['company', 'owner', 'activities.owner', 'deals.owner']);

        return Inertia::render('crm/contacts/show', [
            'contact'      => $contact,
            'activityTypes' => ['call', 'email', 'meeting', 'note', 'task'],
        ]);
    }

    public function edit(Contact $contact): Response
    {
        return Inertia::render('crm/contacts/form', [
            'contact'     => $contact,
            'companies'   => Company::select('id', 'name')->orderBy('name')->get(),
            'teamMembers' => User::select('id', 'name')->get(),
            'stages'      => ['lead', 'prospect', 'customer', 'churned'],
            'sources'     => ['website', 'referral', 'social', 'email', 'phone', 'event', 'other'],
        ]);
    }

    public function update(UpdateContactRequest $request, Contact $contact): RedirectResponse
    {
        $contact->update($request->validated());

        return redirect()->route('contacts.show', $contact)
            ->with('success', 'Contact updated successfully.');
    }

    public function destroy(Contact $contact): RedirectResponse
    {
        $contact->delete();

        return redirect()->route('contacts.index')
            ->with('success', 'Contact deleted.');
    }
}

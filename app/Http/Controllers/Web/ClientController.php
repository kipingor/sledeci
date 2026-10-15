<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Lead;
use App\Models\Opportunity;
use App\Models\Invoice;
use App\Models\Project;
use App\Models\ClientFollowUp;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;

class ClientController extends Controller
{
    // ── Index (CRM list) ──────────────────────────────────────────────────

    public function index(Request $request)
    {
        $query = User::where('is_client', true);

        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('company', 'like', "%{$search}%");
            });
        }

        $clients = $query->withCount(['projects', 'invoices'])
            ->withSum('invoices as total_billed', 'total')
            ->orderBy('name')
            ->paginate(20)
            ->withQueryString();

        $stats = [
            'total'     => User::where('is_client', true)->count(),
            'new_month' => User::where('is_client', true)->whereMonth('client_since', now()->month)->count(),
            'active'    => User::where('is_client', true)->whereHas('projects', fn($q) => $q->where('status', 'active'))->count(),
        ];

        return Inertia::render('clients/index', compact('clients', 'stats'));
    }

    // ── Create ─────────────────────────────────────────────────────────────

    public function create(Request $request)
    {
        // Pre-fill from lead or opportunity if passed
        $prefill = [];
        if ($leadId = $request->get('lead_id')) {
            $lead = Lead::find($leadId);
            if ($lead) {
                $meta = $lead->metadata ?? [];
                $prefill = [
                    'name'       => $meta['contact_name'] ?? '',
                    'email'      => $meta['contact_email'] ?? $meta['email'] ?? '',
                    'phone'      => $meta['contact_phone'] ?? $meta['phone'] ?? '',
                    'company'    => $meta['company_name'] ?? $meta['company'] ?? '',
                    'notes'      => $lead->description,
                    '_lead_id'   => $leadId,
                ];
            }
        }
        if ($oppId = $request->get('opportunity_id')) {
            $opp = Opportunity::find($oppId);
            if ($opp) {
                $prefill = array_merge($prefill, [
                    'name'    => $opp->contact_name ?? '',
                    'email'   => $opp->contact_email ?? '',
                    'phone'   => $opp->contact_phone ?? '',
                    '_opportunity_id' => $oppId,
                ]);
            }
        }

        return Inertia::render('clients/create', compact('prefill'));
    }

    // ── Store ──────────────────────────────────────────────────────────────

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'           => 'required|string|max:255',
            'email'          => 'required|email|unique:users,email',
            'phone'          => 'nullable|string|max:50',
            'company'        => 'nullable|string|max:255',
            'address'        => 'nullable|string',
            'notes'          => 'nullable|string',
            'client_since'   => 'nullable|date',
            '_lead_id'       => 'nullable|exists:leads,id',
            '_opportunity_id' => 'nullable|exists:opportunities,id',
        ]);

        $client = DB::transaction(function () use ($data) {
            $client = User::create([
                'name'         => $data['name'],
                'email'        => $data['email'],
                'phone'        => $data['phone'] ?? null,
                'company'      => $data['company'] ?? null,
                'address'      => $data['address'] ?? null,
                'notes'        => $data['notes'] ?? null,
                'is_client'    => true,
                'client_since' => $data['client_since'] ?? now()->toDateString(),
                'password'     => bcrypt(Str::random(16)), // unusable password
            ]);

            // Link back to lead/opportunity
            if (!empty($data['_lead_id'])) {
                Lead::where('id', $data['_lead_id'])->update(['client_id' => $client->id]);
            }
            if (!empty($data['_opportunity_id'])) {
                Opportunity::where('id', $data['_opportunity_id'])->update(['client_id' => $client->id]);
            }

            return $client;
        });

        return redirect()->route('web.clients.show', $client)
            ->with('success', "{$client->name} added as a client.");
    }

    // ── Show (CRM profile) ─────────────────────────────────────────────────

    public function show(User $client)
    {
        abort_unless($client->is_client, 404);

        $client->load([]);

        $projects = Project::where('client_id', $client->id)
            ->withCount('tasks')
            ->orderByDesc('created_at')->limit(5)->get();

        $invoices = Invoice::where('client_id', $client->id)
            ->with('payments')
            ->orderByDesc('issue_date')->limit(10)->get();

        $leads = Lead::where('client_id', $client->id)
            ->select('id', 'title', 'status', 'created_at')
            ->orderByDesc('created_at')->limit(5)->get();

        $opportunities = Opportunity::where('client_id', $client->id)
            ->select('id', 'title', 'stage', 'estimated_value', 'currency', 'created_at')
            ->orderByDesc('created_at')->limit(5)->get();

        $followUps = ClientFollowUp::where('client_id', $client->id)
            ->whereNull('completed_at')
            ->orderBy('scheduled_at')
            ->limit(5)->get();

        $financials = [
            'total_billed'    => Invoice::where('client_id', $client->id)->whereNotIn('status', ['draft', 'cancelled'])->sum('total'),
            'total_collected' => Invoice::where('client_id', $client->id)->join('payments', 'invoices.id', 'payments.invoice_id')->sum('payments.amount'),
            'total_overdue'   => Invoice::where('client_id', $client->id)->where('status', 'overdue')->sum('total'),
            'projects_count'  => Project::where('client_id', $client->id)->count(),
        ];

        return Inertia::render('clients/show', compact(
            'client', 'projects', 'invoices', 'leads', 'opportunities', 'followUps', 'financials'
        ));
    }

    // ── Edit / Update ──────────────────────────────────────────────────────

    public function edit(User $client)
    {
        abort_unless($client->is_client, 404);
        return Inertia::render('clients/edit', compact('client'));
    }

    public function update(Request $request, User $client)
    {
        abort_unless($client->is_client, 404);

        $data = $request->validate([
            'name'         => 'required|string|max:255',
            'email'        => "required|email|unique:users,email,{$client->id}",
            'phone'        => 'nullable|string|max:50',
            'company'      => 'nullable|string|max:255',
            'address'      => 'nullable|string',
            'notes'        => 'nullable|string',
            'client_since' => 'nullable|date',
        ]);

        $client->update($data);

        return redirect()->route('web.clients.show', $client)
            ->with('success', 'Client updated.');
    }

    // ── Convert from Lead / Opportunity ───────────────────────────────────

    public function convertFromLead(Request $request, Lead $lead)
    {
        // If already linked to a client, redirect there
        if ($lead->client_id) {
            return redirect()->route('web.clients.show', $lead->client_id);
        }

        $meta    = $lead->metadata ?? [];
        $prefill = [
            'name'     => $meta['contact_name'] ?? '',
            'email'    => $meta['contact_email'] ?? $meta['email'] ?? '',
            'phone'    => $meta['contact_phone'] ?? $meta['phone'] ?? '',
            'company'  => $meta['company_name'] ?? $meta['company'] ?? '',
            'notes'    => $lead->description,
            '_lead_id' => $lead->id,
        ];

        return Inertia::render('clients/create', compact('prefill'));
    }

    public function convertFromOpportunity(Request $request, Opportunity $opportunity)
    {
        if ($opportunity->client_id) {
            return redirect()->route('web.clients.show', $opportunity->client_id);
        }

        $prefill = [
            'name'    => $opportunity->contact_name ?? '',
            'email'   => $opportunity->contact_email ?? '',
            'phone'   => $opportunity->contact_phone ?? '',
            '_opportunity_id' => $opportunity->id,
        ];

        return Inertia::render('clients/create', compact('prefill'));
    }

    // ── Destroy ────────────────────────────────────────────────────────────

    public function destroy(User $client)
    {
        abort_unless($client->is_client, 404);
        // Just unflag — don't delete the user record
        $client->update(['is_client' => false]);
        return redirect()->route('web.clients.index')
            ->with('success', 'Client removed from CRM.');
    }
}
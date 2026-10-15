<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Contact;
use App\Models\ContactFollowUp;
use App\Services\Contact\ContactAgentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class ContactController extends Controller
{
    public function __construct(private ContactAgentService $agent) {}

    public function index(Request $request)
    {
        $query = Contact::with('lead:id,title,status')
            ->where('owner_id', Auth::id());

        if ($status = $request->get('status')) {
            $query->where('status', $status);
        }
        if ($search = $request->get('search')) {
            $query->where(fn($q) => $q
                ->where('name', 'like', "%{$search}%")
                ->orWhere('company', 'like', "%{$search}%")
                ->orWhere('email', 'like', "%{$search}%")
            );
        }

        $contacts = $query->orderByDesc('created_at')->paginate(20)->withQueryString();

        $counts = [
            'total'        => Contact::where('owner_id', Auth::id())->count(),
            'new'          => Contact::where('owner_id', Auth::id())->where('status', 'new')->count(),
            'in_progress'  => Contact::where('owner_id', Auth::id())->whereIn('status', ['email_sent', 'following_up'])->count(),
            'responded'    => Contact::where('owner_id', Auth::id())->where('status', 'responded')->count(),
            'converted'    => Contact::where('owner_id', Auth::id())->where('status', 'converted')->count(),
            'due_today'    => Contact::where('owner_id', Auth::id())
                ->whereDate('next_follow_up_at', today())
                ->whereNotIn('status', ['converted', 'dropped'])->count(),
        ];

        return Inertia::render('contacts/index', compact('contacts', 'counts'));
    }

    public function create()
    {
        return Inertia::render('contacts/create');
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'           => 'required|string|max:255',
            'email'          => 'nullable|email|max:255',
            'phone'          => 'nullable|string|max:50',
            'company'        => 'nullable|string|max:255',
            'role'           => 'nullable|string|max:255',
            'event_name'     => 'nullable|string|max:255',
            'event_location' => 'nullable|string|max:255',
            'met_at'         => 'nullable|date',
            'source'         => 'nullable|string',
            'talking_points' => 'nullable|string',
            'notes'          => 'nullable|string',
        ]);

        $contact = Contact::create([
            ...$data,
            'owner_id' => Auth::id(),
            'status'   => 'new',
        ]);

        // AI onboarding: extract context, draft email, schedule follow-ups
        $this->agent->onboard($contact);

        return redirect()
            ->route('web.contacts.show', $contact)
            ->with('success', 'Contact saved — AI has drafted your follow-up emails.');
    }

    public function show(Contact $contact)
    {
        $this->authorize('view', $contact);
        $contact->load(['lead:id,title,status', 'followUps']);

        return Inertia::render('contacts/show', ['contact' => $contact]);
    }

    public function update(Request $request, Contact $contact)
    {
        $this->authorize('update', $contact);

        $contact->update($request->validate([
            'name'           => 'sometimes|required|string|max:255',
            'email'          => 'nullable|email|max:255',
            'phone'          => 'nullable|string|max:50',
            'company'        => 'nullable|string|max:255',
            'role'           => 'nullable|string|max:255',
            'event_name'     => 'nullable|string|max:255',
            'event_location' => 'nullable|string|max:255',
            'met_at'         => 'nullable|date',
            'talking_points' => 'nullable|string',
            'notes'          => 'nullable|string',
            'status'         => 'nullable|in:new,email_sent,following_up,responded,converted,dropped',
        ]));

        return back()->with('success', 'Contact updated.');
    }

    public function destroy(Contact $contact)
    {
        $this->authorize('delete', $contact);
        $contact->delete();
        return redirect()->route('web.contacts.index')->with('success', 'Contact removed.');
    }

    // ── AI Actions ────────────────────────────────────────────────────────

    public function regenerateEmail(Request $request, Contact $contact)
    {
        $this->authorize('update', $contact);
        $draft = $this->agent->regenerateEmail($contact, $request->input('tone', 'professional'));
        return response()->json(['draft' => $draft]);
    }

    public function markInitialSent(Contact $contact)
    {
        $this->authorize('update', $contact);
        $this->agent->markInitialEmailSent($contact);
        return response()->json(['success' => true, 'status' => $contact->fresh()->status]);
    }

    public function sendFollowUp(Request $request, Contact $contact, ContactFollowUp $followUp)
    {
        $this->authorize('update', $contact);
        $this->agent->markFollowUpSent($followUp);
        return response()->json(['success' => true, 'status' => $contact->fresh()->status]);
    }

    public function updateFollowUp(Request $request, Contact $contact, ContactFollowUp $followUp)
    {
        $this->authorize('update', $contact);

        $followUp->update($request->validate([
            'subject'      => 'sometimes|required|string',
            'body'         => 'sometimes|required|string',
            'scheduled_at' => 'sometimes|required|date',
            'status'       => 'sometimes|required|in:scheduled,sent,replied,skipped',
            'reply_notes'  => 'nullable|string',
        ]));

        return response()->json(['success' => true, 'follow_up' => $followUp->fresh()]);
    }

    public function convertToLead(Request $request, Contact $contact)
    {
        $this->authorize('update', $contact);

        if ($contact->lead_id) {
            return response()->json(['error' => 'Already converted to a lead.'], 422);
        }

        $lead = $this->agent->convertToLead($contact);

        return response()->json([
            'success'  => true,
            'lead_id'  => $lead->id,
            'lead_url' => route('web.leads.show', $lead),
        ]);
    }
}
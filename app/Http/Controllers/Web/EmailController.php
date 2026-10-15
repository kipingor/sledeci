<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Jobs\SendEmailJob;
use App\Models\Email;
use App\Models\Lead;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Facades\Auth;

/**
 * BUG FIX: The compose route MUST be registered before the resource routes
 * in web.php, otherwise Laravel matches GET /emails/compose as
 * Route::show($email) with $email = 'compose', causing a model-not-found 404.
 *
 * Correct order in web.php:
 *   Route::get('emails/compose', [EmailController::class, 'compose'])->name('emails.compose');
 *   Route::resource('emails', EmailController::class)->except(['edit', 'update']);
 *
 * BUG FIX 2: store() now dispatches SendEmailJob when status === 'queued'.
 */
class EmailController extends Controller
{
    public function index(Request $request): Response
    {
        $emails = Email::with([
                'lead:id,title',
                'opportunity:id,title',
                'sender:id,name,avatar',
            ])
            ->when($request->filled('direction'), fn ($q) => $q->where('direction', $request->direction))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->status))
            ->when($request->filled('lead_id'), fn ($q) => $q->where('lead_id', $request->lead_id))
            ->when($request->filled('search'), fn ($q) => $q->where(function ($q) use ($request) {
                $q->where('subject', 'like', "%{$request->search}%")
                  ->orWhere('to', 'like', "%{$request->search}%");
            }))
            ->latest()
            ->paginate(25)
            ->withQueryString();

        return Inertia::render('emails/index', [
            'emails'  => $emails,
            'filters' => $request->only(['direction', 'status', 'lead_id', 'search']),
            'stats'   => [
                'sent'     => Email::where('direction', 'outbound')->whereIn('status', ['sent', 'delivered'])->count(),
                'received' => Email::where('direction', 'inbound')->count(),
                'drafts'   => Email::where('status', 'draft')->count(),
                'failed'   => Email::where('status', 'failed')->count(),
            ],
        ]);
    }

    public function show(Email $email): Response
    {
        $email->load(['lead:id,title,status', 'opportunity:id,title', 'sender:id,name,avatar']);
        return Inertia::render('emails/show', compact('email'));
    }

    /**
     * Compose form — pre-fill lead/opportunity context if passed as query params.
     * NOTE: This route must be registered BEFORE the resource routes in web.php.
     */
    public function compose(Request $request): Response
    {
        $prefill = [];

        if ($leadId = $request->get('lead_id')) {
            $lead = Lead::select(['id', 'title'])->with('owner:id,email')->find($leadId);
            if ($lead) {
                $prefill['lead_id'] = $lead->id;
                $prefill['lead']    = $lead;
                $prefill['to']      = $lead->owner?->email ?? '';
            }
        }

        if ($oppId = $request->get('opportunity_id')) {
            $prefill['opportunity_id'] = $oppId;
        }

        return Inertia::render('emails/compose', [
            'prefill' => $prefill,
            'leads'   => Lead::select(['id', 'title'])->orderBy('title')->limit(200)->get(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'lead_id'        => ['nullable', 'exists:leads,id'],
            'opportunity_id' => ['nullable', 'exists:opportunities,id'],
            'to'             => ['required', 'string'],   // field name is 'to', NOT 'recipient'
            'subject'        => ['required', 'string', 'max:255'],
            'body'           => ['required', 'string'],
            'send_now'       => ['boolean'],
        ]);

        $email = Email::create([
            'lead_id'        => $data['lead_id'] ?? null,
            'opportunity_id' => $data['opportunity_id'] ?? null,
            'to'             => $data['to'],
            'subject'        => $data['subject'],
            'body'           => $data['body'],
            'sender_id'      => Auth::id(),
            'from'           => Auth::user()->email,
            'direction'      => 'outbound',
            'status'         => $request->boolean('send_now') ? 'queued' : 'draft',
        ]);

        // BUG FIX: the original had a // TODO comment — job was never dispatched.
        if ($email->status === 'queued') {
            SendEmailJob::dispatch($email);
        }

        return redirect()->route('emails.show', $email->id)
            ->with('success', $email->status === 'queued' ? 'Email queued for sending.' : 'Draft saved.');
    }

    public function destroy(Email $email): RedirectResponse
    {
        $email->delete();
        return redirect()->route('emails.index')->with('success', 'Email deleted.');
    }
}

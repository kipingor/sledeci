<?php

namespace App\Http\Controllers\Site;

use App\Http\Controllers\Controller;
use App\Http\Requests\Careers\StoreContactMessageRequest;
use App\Models\ContactMessage;
use App\Models\JobPosting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Fortify\Features;
use Throwable;

/**
 * Public marketing pages. None of these require a login.
 */
class SiteController extends Controller
{
    public function home(): Response|RedirectResponse
    {
        if (Auth::check()) {
            return redirect()->route('web.dashboard');
        }

        return Inertia::render('welcome', [
            'canRegister' => Features::enabled(Features::registration()),
            'openRoles' => JobPosting::open()->count(),
        ]);
    }

    public function about(): Response
    {
        return Inertia::render('site/about');
    }

    public function solutions(): Response
    {
        return Inertia::render('site/solutions');
    }

    public function terms(): Response
    {
        return Inertia::render('site/terms', [
            'legalName' => config('site.legal_name'),
            'country' => config('site.country'),
            'governingLaw' => config('site.governing_law'),
            'updatedAt' => config('site.terms_updated'),
        ]);
    }

    public function contact(): Response
    {
        return Inertia::render('site/contact', [
            'details' => [
                'email' => config('site.contact_email'),
                'phone' => config('site.phone'),
                'address' => config('site.address'),
                'linkedin' => config('site.linkedin_company_url'),
            ],
        ]);
    }

    public function storeContact(StoreContactMessageRequest $request): RedirectResponse
    {
        $data = $request->safe()->except('website');

        $message = ContactMessage::create([...$data, 'ip_address' => $request->ip()]);

        try {
            Mail::raw(
                "New website enquiry #{$message->id}\n\n"
                ."Name: {$message->name}\nEmail: {$message->email}\n"
                .'Phone: '.($message->phone ?: '-')."\nCompany: ".($message->company ?: '-')."\n"
                .'Subject: '.($message->subject ?: '-')."\n\n{$message->message}\n",
                fn ($mail) => $mail
                    ->to(config('site.contact_email'))
                    ->replyTo($message->email, $message->name)
                    ->subject('Website enquiry: '.($message->subject ?: $message->name))
            );
        } catch (Throwable $e) {
            // The enquiry is already saved; a mail outage must not lose it or show an error.
            report($e);
        }

        return back()->with('success', 'Thank you. Your message has been received and we will get back to you shortly.');
    }
}

<?php

namespace App\Services\Contact;

use App\Models\Contact;
use App\Models\ContactFollowUp;
use App\Models\Lead;
use App\Services\AI\AiClientInterface;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class ContactAgentService
{
    public function __construct(
        private AiClientInterface $ai
    ) {}

    /**
     * Full AI onboarding for a new contact:
     * 1. Extract structured context from talking points
     * 2. Draft the initial outreach email
     * 3. Generate a 3-touch follow-up schedule
     * 4. Persist follow-up rows in contact_follow_ups
     */
    public function onboard(Contact $contact): Contact
    {
        try {
            $context = $this->extractContext($contact);
            $contact->ai_context_summary = $context;

            // Populate key_topics from AI-extracted context
            if (! empty($context['key_topics'])) {
                $contact->key_topics = $context['key_topics'];
            }

            $contact->ai_email_draft = $this->draftInitialEmail($contact, $context);
            $contact->ai_follow_up_schedule = $this->buildFollowUpSchedule($contact, $context);
            $contact->save();

            $this->persistFollowUps($contact);

        } catch (\Exception $e) {
            Log::error('ContactAgentService::onboard failed', [
                'contact_id' => $contact->id,
                'error' => $e->getMessage(),
            ]);
        }

        return $contact->refresh();
    }

    /**
     * Regenerate just the initial email draft (e.g. user adjusts tone).
     */
    public function regenerateEmail(Contact $contact, string $tone = 'professional'): string
    {
        $context = $contact->ai_context_summary ?? $this->extractContext($contact);

        $summary = $context['summary'] ?? $contact->talking_points ?? '';
        $opportunities = implode(', ', $context['opportunities'] ?? []);
        $nextStep = $context['next_step_suggestion'] ?? 'schedule a short call';
        $sender = Auth::user()?->name ?? 'our team';

        $prompt = <<<PROMPT
Write a warm, personalised follow-up email from {$sender} to {$contact->name}.

Tone: {$tone}
Meeting summary: {$summary}
Opportunities identified: {$opportunities}
Recommended next step: {$nextStep}
Their company: {$contact->company}
Their role: {$contact->role}

Rules:
- Reference something specific from the meeting
- Under 130 words
- One clear CTA aligned to the next step
- No subject line — body only

Return ONLY the email body.
PROMPT;

        $draft = $this->ai->chat($prompt, ['max_tokens' => 350, 'temperature' => 0.7]);
        $contact->update(['ai_email_draft' => $draft]);

        return $draft;
    }

    /**
     * Mark a follow-up as sent; update contact tracking counters.
     */
    public function markFollowUpSent(ContactFollowUp $followUp): void
    {
        $followUp->update(['status' => 'sent', 'sent_at' => now()]);

        $contact = $followUp->contact;
        $contact->increment('follow_up_count');
        $contact->update([
            'status' => 'following_up',
            'last_contact_at' => now(),
        ]);

        $next = $contact->followUps()
            ->where('status', 'scheduled')
            ->orderBy('scheduled_at')
            ->first();
        $contact->update(['next_follow_up_at' => $next?->scheduled_at]);
    }

    /**
     * Mark the initial email as sent (before any follow-ups).
     */
    public function markInitialEmailSent(Contact $contact): void
    {
        $contact->update([
            'status' => 'email_sent',
            'last_contact_at' => now(),
            'follow_up_count' => $contact->follow_up_count + 1,
        ]);

        $next = $contact->followUps()
            ->where('status', 'scheduled')
            ->orderBy('scheduled_at')
            ->first();
        $contact->update(['next_follow_up_at' => $next?->scheduled_at]);
    }

    /**
     * Convert a contact into a Lead and link them.
     */
    public function convertToLead(Contact $contact, array $extra = []): Lead
    {
        $summary = $contact->ai_context_summary['summary'] ?? $contact->talking_points ?? '';

        $lead = Lead::create([
            'title' => 'Follow-up: '.$contact->name.($contact->company ? " ({$contact->company})" : ''),
            'description' => trim(implode("\n\n", array_filter([$summary, $contact->notes]))),
            'status' => 'new',
            'type' => 'manual',
            'created_by' => Auth::id(),
            'owner_id' => $contact->owner_id,
            'metadata' => [
                'source' => 'networking_contact',
                'contact_id' => $contact->id,
                'contact_name' => $contact->name,
                'contact_company' => $contact->company,
                'contact_email' => $contact->email,
                'event_name' => $contact->event_name,
                'met_at' => $contact->met_at?->toDateString(),
                'key_topics' => $contact->key_topics,
            ],
            ...$extra,
        ]);

        $contact->update(['lead_id' => $lead->id, 'status' => 'converted']);

        return $lead;
    }

    // ── Private helpers ───────────────────────────────────────────────────

    private function extractContext(Contact $contact): array
    {
        $notes = trim(($contact->talking_points ?? '')."\n".($contact->notes ?? ''));
        if (empty($notes)) {
            return ['summary' => '', 'key_topics' => [], 'pain_points' => [], 'opportunities' => [], 'next_step_suggestion' => 'schedule a brief introductory call'];
        }

        $prompt = <<<PROMPT
Analyse these networking meeting notes and return a JSON object with:
- summary: 2-3 sentence overview of the person and meeting
- key_topics: array of 3-6 short topic tags (e.g. "cloud migration", "budget constraints")
- pain_points: array of problems or challenges the contact mentioned
- opportunities: array of specific ways we could help them
- next_step_suggestion: one sentence — the best single follow-up action to take

Person: {$contact->name}, {$contact->role} at {$contact->company}
Event: {$contact->event_name}

Meeting notes:
{$notes}

Respond with ONLY valid JSON, no markdown fences.
PROMPT;

        try {
            $raw = $this->ai->chat($prompt, ['max_tokens' => 500, 'temperature' => 0.3]);
            $data = json_decode(trim($raw), true);

            return is_array($data) ? $data : ['summary' => $notes, 'key_topics' => [], 'pain_points' => [], 'opportunities' => [], 'next_step_suggestion' => ''];
        } catch (\Exception $e) {
            return ['summary' => $notes, 'key_topics' => [], 'pain_points' => [], 'opportunities' => [], 'next_step_suggestion' => ''];
        }
    }

    private function draftInitialEmail(Contact $contact, array $context): string
    {
        $summary = $context['summary'] ?? $contact->talking_points ?? '';
        $opportunities = implode(', ', $context['opportunities'] ?? []);
        $nextStep = $context['next_step_suggestion'] ?? 'schedule a short call';
        $sender = Auth::user()?->name ?? 'our team';

        $prompt = <<<PROMPT
Write a warm, personalised outreach email from {$sender} to {$contact->name} ({$contact->role} at {$contact->company}).

Meeting context: {$summary}
How we can help: {$opportunities}
Suggested next step: {$nextStep}

Rules:
- Reference the specific meeting or event where you met
- Feel genuine, not templated
- Under 130 words
- One clear, low-pressure CTA
- No subject line — body only

Return ONLY the email body.
PROMPT;

        return $this->ai->chat($prompt, ['max_tokens' => 350, 'temperature' => 0.7]);
    }

    private function buildFollowUpSchedule(Contact $contact, array $context): array
    {
        $summary = $context['summary'] ?? '';
        $topics = implode(', ', $context['key_topics'] ?? []);

        $prompt = <<<PROMPT
Create a 3-email follow-up sequence to send after the initial outreach to {$contact->name} ({$contact->role} at {$contact->company}).

Meeting context: {$summary}
Key topics: {$topics}

For each email provide:
- day_offset: days after the initial email (use 4, 12, 28)
- subject: compelling subject line
- body: email body under 120 words, no subject line

Return ONLY a JSON array of exactly 3 objects with keys: day_offset, subject, body.
PROMPT;

        try {
            $raw = $this->ai->chat($prompt, ['max_tokens' => 900, 'temperature' => 0.65]);
            $raw = preg_replace('/```json\s*|\s*```/', '', trim($raw));
            $items = json_decode($raw, true);

            return is_array($items) && count($items) >= 1 ? $items : $this->defaultSchedule();
        } catch (\Exception $e) {
            return $this->defaultSchedule();
        }
    }

    private function persistFollowUps(Contact $contact): void
    {
        $contact->followUps()->where('status', 'scheduled')->delete();

        $schedule = $contact->ai_follow_up_schedule ?? [];
        $base = now()->addDay();   // initial email is day 0; follow-ups start tomorrow+

        foreach ($schedule as $i => $item) {
            ContactFollowUp::create([
                'contact_id' => $contact->id,
                'sequence' => $i + 1,
                'subject' => $item['subject'] ?? 'Follow-up #'.($i + 1),
                'body' => $item['body'] ?? '',
                'status' => 'scheduled',
                'scheduled_at' => $base->copy()->addDays((int) ($item['day_offset'] ?? ($i + 1) * 7)),
            ]);
        }

        $first = $contact->followUps()->where('status', 'scheduled')->orderBy('scheduled_at')->first();
        $contact->update(['next_follow_up_at' => $first?->scheduled_at]);
    }

    private function defaultSchedule(): array
    {
        return [
            ['day_offset' => 4,  'subject' => 'Great meeting you — quick follow-up', 'body' => "Hi,\n\nJust following up on my earlier email. I'd love to find a time for a brief call to explore how we might work together.\n\nAre you available for 20 minutes this week or next?\n\nBest regards"],
            ['day_offset' => 12, 'subject' => "A resource I thought you'd find useful", 'body' => "Hi,\n\nI came across something relevant to what we discussed and thought it might be helpful.\n\nHappy to walk you through how this could apply to your situation if you'd like.\n\nBest regards"],
            ['day_offset' => 28, 'subject' => 'Checking in', 'body' => "Hi,\n\nI appreciate your time earlier. Just checking in one final time — happy to connect whenever the timing works for you.\n\nBest regards"],
        ];
    }
}

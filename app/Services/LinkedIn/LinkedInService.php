<?php

namespace App\Services\LinkedIn;

use App\Models\JobPosting;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Throwable;

/**
 * Helps HR announce a job on LinkedIn.
 *
 * Two modes, both available from HR > Jobs > LinkedIn:
 *  1. Manual (always works): a ready-made post and a LinkedIn share link; HR
 *     reviews and publishes it from LinkedIn.
 *  2. API (optional): when LINKEDIN_ACCESS_TOKEN and LINKEDIN_AUTHOR_URN are set,
 *     the post is published directly through the UGC Posts API. The token must
 *     come from a LinkedIn developer app that has been granted posting
 *     permission, and it expires, so the manual mode stays as the fallback.
 *
 * The API call has not been exercised against LinkedIn from this codebase;
 * test it with a draft/private post before relying on it.
 */
class LinkedInService
{
    private const POST_ENDPOINT = 'https://api.linkedin.com/v2/ugcPosts';

    public function isConfigured(): bool
    {
        return filled(config('services.linkedin.access_token')) && filled(config('services.linkedin.author_urn'));
    }

    public function jobUrl(JobPosting $job): string
    {
        return route('careers.show', ['jobPosting' => $job, 'src' => 'linkedin']);
    }

    public function shareUrl(JobPosting $job): string
    {
        return 'https://www.linkedin.com/sharing/share-offsite/?url='.rawurlencode($this->jobUrl($job));
    }

    /**
     * Suggested post text. LinkedIn allows about 3,000 characters; we stay well under.
     */
    public function compose(JobPosting $job): string
    {
        $facts = array_filter([
            $job->department,
            $job->is_remote ? 'Remote' : $job->location,
            $job->employmentTypeLabel(),
        ]);

        $lines = [
            "We're hiring: {$job->title}",
            $facts === [] ? null : implode(' · ', $facts),
            '',
            $job->summary ? Str::limit(trim($job->summary), 280) : Str::limit(trim(strip_tags((string) $job->description)), 280),
            '',
            'Apply here: '.$this->jobUrl($job),
        ];

        $tags = collect(config('site.hashtags', []))->map(fn ($t) => '#'.preg_replace('/\W+/', '', $t))->filter()->implode(' ');

        if ($tags !== '') {
            $lines[] = '';
            $lines[] = $tags;
        }

        return trim(implode("\n", array_filter($lines, fn ($l) => $l !== null)));
    }

    /**
     * @return array{success: bool, urn: ?string, error: ?string}
     */
    public function publish(JobPosting $job, string $text): array
    {
        if (! $this->isConfigured()) {
            return ['success' => false, 'urn' => null, 'error' => 'LinkedIn API credentials are not configured.'];
        }

        $payload = [
            'author' => config('services.linkedin.author_urn'),
            'lifecycleState' => 'PUBLISHED',
            'specificContent' => [
                'com.linkedin.ugc.ShareContent' => [
                    'shareCommentary' => ['text' => Str::limit($text, 2900, '')],
                    'shareMediaCategory' => 'ARTICLE',
                    'media' => [[
                        'status' => 'READY',
                        'originalUrl' => $this->jobUrl($job),
                        'title' => ['text' => Str::limit($job->title, 190, '')],
                    ]],
                ],
            ],
            'visibility' => ['com.linkedin.ugc.MemberNetworkVisibility' => 'PUBLIC'],
        ];

        try {
            $response = Http::withToken((string) config('services.linkedin.access_token'))
                ->withHeaders(['X-Restli-Protocol-Version' => '2.0.0'])
                ->acceptJson()
                ->timeout(15)
                ->post(self::POST_ENDPOINT, $payload);
        } catch (Throwable $e) {
            report($e);

            return ['success' => false, 'urn' => null, 'error' => 'Could not reach LinkedIn. Try again, or use the share link.'];
        }

        if ($response->successful()) {
            return ['success' => true, 'urn' => $response->header('x-restli-id') ?: $response->json('id'), 'error' => null];
        }

        return [
            'success' => false,
            'urn' => null,
            'error' => $response->json('message') ?: "LinkedIn rejected the post (HTTP {$response->status()}).",
        ];
    }
}

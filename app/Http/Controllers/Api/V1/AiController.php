<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\AiRequest;
use App\Models\Lead;
use App\Models\LeadDocument;
use App\Models\LeadQuestion;
use App\Services\AI\AiClientInterface;
use App\Services\AI\DocumentExtractionService;
use App\Services\AI\EmailDraftingService;
use App\Services\AI\LeadAnalysisService;
use App\Support\AiProviderTimeout;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\JsonResponse;

class AiController extends Controller
{
    /** Analyze uploaded document or lead metadata and return questions/summaries */
    public function analyze(AiRequest $request, LeadAnalysisService $leadAnalysisService): JsonResponse
    {
        $payload = $request->validated();

        try {
            $result = $leadAnalysisService->analyze($payload);
        } catch (ConnectionException $e) {
            return AiProviderTimeout::response($e, 'lead analysis');
        }

        return response()->json(['ok' => true, 'data' => $result]);
    }


    /** Draft an email using the AI service */
    public function draftEmail(AiRequest $request, EmailDraftingService $emailService): JsonResponse
    {
        $payload = $request->validated();

        try {
            $email = $emailService->draftEmail($payload['context'] ?? '', $payload['instructions'] ?? '');
        } catch (ConnectionException $e) {
            return AiProviderTimeout::response($e, 'email drafting');
        }

        return response()->json(['ok' => true, 'email' => $email]);
    }

    /**
     * Generic content generation from free-form context + instructions
     * (e.g. proposal blurbs, social copy, internal notes) — for anything
     * that doesn't warrant its own dedicated service like draftEmail does.
     */
    public function generateContent(AiRequest $request, AiClientInterface $client): JsonResponse
    {
        $payload = $request->validated();

        if (empty($payload['context']) && empty($payload['instructions'])) {
            return response()->json([
                'ok' => false,
                'message' => 'At least one of context or instructions is required.',
            ], 422);
        }

        $prompt = "Generate content based on the following.\n";
        if (!empty($payload['context'])) {
            $prompt .= "Context:\n{$payload['context']}\n\n";
        }
        if (!empty($payload['instructions'])) {
            $prompt .= "Instructions:\n{$payload['instructions']}";
        }

        try {
            $content = $client->chat($prompt, ['max_tokens' => 800, 'temperature' => 0.6]);
        } catch (ConnectionException $e) {
            return AiProviderTimeout::response($e, 'content generation');
        }

        return response()->json(['ok' => true, 'content' => trim($content)]);
    }

    /**
     * Continue an existing lead conversation: given the client's latest
     * answer/message (sent as `instructions`), reply with the AI's next
     * response and log it as a new question on the lead's timeline.
     */
    public function followUp(AiRequest $request, AiClientInterface $client): JsonResponse
    {
        $payload = $request->validated();

        if (empty($payload['instructions'])) {
            return response()->json([
                'ok' => false,
                'message' => 'instructions (the message to follow up on) is required.',
            ], 422);
        }

        $lead = !empty($payload['lead_id']) ? Lead::find($payload['lead_id']) : null;

        $history = '';
        if ($lead) {
            $history = $lead->questions()
                ->latest()
                ->limit(10)
                ->get()
                ->reverse()
                ->map(fn (LeadQuestion $q) => "Q: {$q->question}\nA: " . ($q->answer ?? '[unanswered]'))
                ->implode("\n\n");
        }

        $prompt = "You are following up on an ongoing conversation with a sales lead.\n";
        if ($history !== '') {
            $prompt .= "Prior questions and answers:\n{$history}\n\n";
        }
        if (!empty($payload['context'])) {
            $prompt .= "Additional context:\n{$payload['context']}\n\n";
        }
        $prompt .= "Latest message from the client:\n{$payload['instructions']}\n\n";
        $prompt .= 'Reply with a helpful follow-up response, and if useful, one clarifying question to ask next.';

        try {
            $response = trim($client->chat($prompt, ['max_tokens' => 500, 'temperature' => 0.3]));
        } catch (ConnectionException $e) {
            return AiProviderTimeout::response($e, 'lead follow-up generation');
        }

        if ($lead) {
            LeadQuestion::create([
                'lead_id' => $lead->id,
                'question' => $response,
                'is_ai_generated' => true,
                'answered' => false,
            ]);
        }

        return response()->json(['ok' => true, 'response' => $response]);
    }

    /**
     * Run AI extraction (entities, keywords, budget, timeline, requirements,
     * summary) against a previously uploaded lead document.
     */
    public function extractDocument(AiRequest $request, DocumentExtractionService $extractor): JsonResponse
    {
        $payload = $request->validated();

        if (empty($payload['document_id'])) {
            return response()->json([
                'ok' => false,
                'message' => 'document_id is required.',
            ], 422);
        }

        $document = LeadDocument::find($payload['document_id']);
        if (!$document) {
            return response()->json(['ok' => false, 'message' => 'Document not found.'], 404);
        }

        try {
            $data = $extractor->extract($document);
        } catch (ConnectionException $e) {
            return AiProviderTimeout::response($e, 'document extraction');
        }

        return response()->json(['ok' => true, 'data' => $data]);
    }
}
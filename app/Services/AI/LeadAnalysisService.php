<?php

namespace App\Services\AI;

use App\Enums\LeadDocumentStatus;
use App\Models\Lead;
use App\Models\LeadDocument;
use App\Models\LeadQuestion;
use Exception;

class LeadAnalysisService
{
    public function __construct(
        private AiClientInterface $client,
        private DocumentExtractionService $extractor
    ) {}

    /**
     * Analyze a lead by id or payload. If document_id is provided, extract text and analyze.
     * Returns structured array with summary and clarifying questions.
     *
     * @param  array  $payload  ['lead_id' => int|null, 'document_id' => int|null, 'context' => string|null]
     *
     * @throws Exception
     */
    public function analyze(array $payload): array
    {
        $leadText = '';
        $lead = null;

        // Get document content if document_id provided
        if (! empty($payload['document_id'])) {
            $doc = LeadDocument::find($payload['document_id']);
            if (! $doc) {
                throw new Exception('Document not found');
            }
            $extracted = $this->extractor->extract($doc);
            $leadText = $extracted['text'] ?? '';
        }

        // Get lead description if lead_id provided
        if (! empty($payload['lead_id'])) {
            $lead = Lead::find($payload['lead_id']);
            if ($lead && $lead->description) {
                // Only append if leadText already present (from doc)
                $leadText = trim(($leadText ? $leadText."\n\n" : '').$lead->description);
            }
        }

        // Add context if available
        $prompt = $this->buildPromptForAnalysis($leadText, $payload['context'] ?? '');

        $aiResponse = $this->client->chat($prompt, ['temperature' => 0.15]);

        // Expect AI to return JSON with keys: summary, requirements, questions
        $json = $this->extractJsonFromResponse($aiResponse);

        // Store metadata/questions on lead if lead_id given and lead exists
        if (! empty($payload['lead_id']) && $lead && is_array($json)) {
            // Store requirements as metadata (null if missing)
            $lead->metadata = $json['requirements'] ?? null;
            $lead->ai_reviewed = true;
            $lead->save();

            // Insert questions as LeadQuestion records (skip if no questions array)
            if (! empty($json['questions']) && is_array($json['questions'])) {
                foreach ($json['questions'] as $i => $q) {
                    if (! empty($q)) {
                        LeadQuestion::create([
                            'lead_id' => $lead->id,
                            'question' => $q,
                            'order' => $i,
                        ]);
                    }
                }
            }
        }

        return $json;
    }

    public function reanalyzeLead(Lead $lead): array
    {
        // For each document, ensure it has extracted_text and ai_summary
        foreach ($lead->leadDocuments as $doc) {
            if (empty($doc->extracted_text) || empty($doc->extracted_text['text'])) {
                $extracted = $this->extractor->extract($doc);
                $text = $extracted['text'] ?? '';
                if (! empty($text)) {
                    $doc->extracted_text = ['text' => $text];
                    $doc->save();
                }
            }

            if (empty($doc->ai_summary)) {
                $prompt = "Summarize this document into 3–6 bullet points and list action items:\n\n".
                          mb_substr($doc->extracted_text['text'] ?? '', 0, 30000);

                $summary = $this->client->chat($prompt, [
                    'max_tokens' => 500,
                    'temperature' => 0.2,
                ]);

                $doc->ai_summary = [
                    'summary' => is_string($summary) ? trim($summary) : $summary,
                    'generated_at' => now()->toDateTimeString(),
                ];
                $doc->status = LeadDocumentStatus::SUCCEEDED;
                $doc->save();
            }
        }

        // Additional: generate lead-level suggestions (questions, next steps)
        $leadPrompt = "Given the following documents and lead description, suggest 5 follow-up questions and next steps.\n\nLead:\n".
                      ($lead->description ?? '')."\n\nDocuments:\n";
        foreach ($lead->leadDocuments as $d) {
            $leadPrompt .= ($d->ai_summary['summary'] ?? '')."\n";
        }

        $leadSuggestions = $this->client->chat($leadPrompt, ['max_tokens' => 400, 'temperature' => 0.2]);

        $lead->metadata = array_merge($lead->metadata ?? [], [
            'ai_suggestions' => is_string($leadSuggestions) ? trim($leadSuggestions) : $leadSuggestions,
        ]);
        $lead->ai_reviewed = true;
        $lead->save();

        return $lead->metadata;
    }

    /**
     * Analyze one uploaded document (helper used in store)
     */
    public function analyzeUploadedDocument(Lead $lead, int $documentId): void
    {
        $document = LeadDocument::find($documentId);
        if (! $document) {
            return;
        }

        // If ProcessLeadDocument job exists, you might prefer to dispatch it instead.
        // Here, for convenience, call reanalyze for the lead which will inspect docs.
        $this->reanalyzeLead($lead);
    }

    private function buildPromptForAnalysis(string $text, string $context = ''): string
    {
        $instructions = 'You are an expert requirements analyst. Given the following document or description, extract a concise summary, a structured list of requirements, and produce up to 8 clarifying questions to ask the client. Respond in JSON with keys: summary, requirements (array of {id, title, details}), questions (array of strings).';
        $prompt = $instructions."\n\n";
        if ($context !== '') {
            $prompt .= "Context:\n".$context."\n\n";
        }
        $prompt .= "Document:\n".($text !== '' ? $text : '[no text provided]');

        return $prompt;
    }

    /**
     * Attempt to pull JSON from openai output. If plain text, try to detect JSON substring.
     */
    private function extractJsonFromResponse(string $text): array
    {
        $text = trim($text);

        // Try direct json decode
        $decoded = json_decode($text, true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
            return $decoded;
        }

        // Search for first '{' and last '}' and try to decode substring
        $start = strpos($text, '{');
        $end = strrpos($text, '}');
        if ($start !== false && $end !== false && $end > $start) {
            $substr = substr($text, $start, $end - $start + 1);
            $decoded = json_decode($substr, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                return $decoded;
            }
        }

        // As a fallback, create a simple structure
        return [
            'summary' => mb_substr($text, 0, 1000),
            'requirements' => [],
            'questions' => [],
        ];
    }
}

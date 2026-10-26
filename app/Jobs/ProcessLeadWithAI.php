<?php

namespace App\Jobs;

use App\Models\Lead;
use App\Services\AI\AiClientInterface;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ProcessLeadWithAI implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The number of times the job may be attempted.
     */
    public $tries = 3;

    /**
     * The number of seconds to wait before retrying the job.
     */
    public $backoff = 120;

    /**
     * The number of seconds the job can run before timing out.
     */
    public $timeout = 300;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public Lead $lead
    ) {}

    /**
     * Execute the job.
     */
    public function handle(AiClientInterface $aiClient): void
    {
        try {
            Log::info('Processing lead with AI', [
                'lead_id' => $this->lead->id,
            ]);

            // Extract lead content
            $content = $this->extractLeadContent();

            if (empty($content)) {
                Log::warning('No content to process', [
                    'lead_id' => $this->lead->id,
                ]);

                return;
            }

            // Analyze with AI
            $analysis = $this->analyzeWithAI($aiClient, $content);

            // Store AI analysis results
            $this->lead->update([
                'ai_analysis' => $analysis,
                'ai_processed_at' => now(),
            ]);

            Log::info('Lead AI processing complete', [
                'lead_id' => $this->lead->id,
                'sentiment' => $analysis['sentiment'] ?? 'unknown',
            ]);

        } catch (\Throwable $e) {
            Log::error('AI processing failed', [
                'lead_id' => $this->lead->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            throw $e;
        }
    }

    /**
     * Extract content from lead for AI processing
     */
    protected function extractLeadContent(): string
    {
        $content = [];

        if ($this->lead->title) {
            $content[] = "Title: {$this->lead->title}";
        }

        if ($this->lead->description) {
            $content[] = "Description: {$this->lead->description}";
        }

        if ($this->lead->conversation_content) {
            $content[] = "Conversation: {$this->lead->conversation_content}";
        }

        return implode("\n\n", $content);
    }

    /**
     * Analyze content with AI
     */
    protected function analyzeWithAI(AiClientInterface $aiClient, string $content): array
    {
        $prompt = $this->buildAnalysisPrompt($content);

        try {
            $response = $aiClient->chat($prompt);

            // Parse AI response
            return $this->parseAIResponse($response);

        } catch (\Exception $e) {
            Log::error('AI API call failed', [
                'lead_id' => $this->lead->id,
                'error' => $e->getMessage(),
            ]);

            // Return default analysis on failure
            return [
                'sentiment' => 'neutral',
                'confidence' => 0,
                'summary' => 'AI analysis unavailable',
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Build prompt for AI analysis
     */
    protected function buildAnalysisPrompt(string $content): string
    {
        return <<<PROMPT
Analyze the following lead information and provide:
1. Sentiment (positive, neutral, negative)
2. Intent (e.g., inquiry, complaint, purchase intent)
3. Urgency level (low, medium, high)
4. Key topics mentioned
5. Suggested next actions
6. Brief summary

Lead Information:
{$content}

Respond in JSON format with the following structure:
{
    "sentiment": "positive|neutral|negative",
    "intent": "string",
    "urgency": "low|medium|high",
    "topics": ["topic1", "topic2"],
    "suggested_actions": ["action1", "action2"],
    "summary": "Brief summary of the lead",
    "confidence": 0.0-1.0
}
PROMPT;
    }

    /**
     * Parse AI response into structured array
     */
    protected function parseAIResponse(string $response): array
    {
        try {
            // Try to parse as JSON
            $data = json_decode($response, true);

            if (json_last_error() === JSON_ERROR_NONE) {
                return [
                    'sentiment' => $data['sentiment'] ?? 'neutral',
                    'intent' => $data['intent'] ?? 'unknown',
                    'urgency' => $data['urgency'] ?? 'medium',
                    'topics' => $data['topics'] ?? [],
                    'suggested_actions' => $data['suggested_actions'] ?? [],
                    'summary' => $data['summary'] ?? 'No summary available',
                    'confidence' => $data['confidence'] ?? 0.5,
                    'raw_response' => $response,
                ];
            }

            // If not JSON, return raw response
            return [
                'sentiment' => 'neutral',
                'confidence' => 0.5,
                'summary' => $response,
                'raw_response' => $response,
            ];

        } catch (\Exception $e) {
            Log::error('Failed to parse AI response', [
                'lead_id' => $this->lead->id,
                'error' => $e->getMessage(),
            ]);

            return [
                'sentiment' => 'neutral',
                'confidence' => 0,
                'summary' => 'Failed to parse AI response',
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error('AI processing job failed permanently', [
            'lead_id' => $this->lead->id,
            'error' => $exception->getMessage(),
        ]);

        // Mark lead as AI processing failed
        $this->lead->update([
            'ai_analysis' => [
                'error' => $exception->getMessage(),
                'failed_at' => now()->toISOString(),
            ],
            'ai_processed_at' => now(),
        ]);
    }
}

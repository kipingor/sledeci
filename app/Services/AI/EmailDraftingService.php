<?php

namespace App\Services\AI;

use Exception;

class EmailDraftingService
{
    public function __construct(
        private AiClientInterface $client
    ) {}

    /**
     * Draft an email given context and instructions
     *
     * @throws Exception
     */
    public function draftEmail(string $context, string $instructions): string
    {
        if (empty($context) && empty($instructions)) {
            throw new Exception('At least one of context or instructions are required to draft an email.');
        }

        $prompt = "Given the following information, draft a professional email.\n";
        if (! empty($context)) {
            $prompt .= "Context: {$context}\n";
        }
        if (! empty($instructions)) {
            $prompt .= "Instructions: {$instructions}";
        }

        try {
            $response = $this->client->chat($prompt, [
                'max_tokens' => 500,
                'temperature' => 0.7,
            ]);
        } catch (Exception $e) {
            throw new Exception('Failed to generate email draft: '.$e->getMessage());
        }

        // chat() on both OpenAIClient and ClaudeAIClient always returns a string
        return trim($response);
    }
}

<?php

namespace App\Services\AI;

use Illuminate\Support\Facades\Log;

class NullOpenAIClient implements AiClientInterface
{
    public function chat($messages, array $options = []): string
    {
        Log::warning('OpenAI not configured - returning dummy response');

        return 'AI features are not available. Please configure AI_API_KEY.';
    }

    public function chatStream($messages, callable $callback, array $options = []): void
    {
        $callback('AI features are not available.');
    }

    public function embeddings($input, string $model = 'text-embedding-ada-002'): array
    {
        return [];
    }

    public function imageGeneration(string $prompt, array $options = []): array
    {
        return [];
    }

    public function moderation(string $content): array
    {
        return ['flagged' => false];
    }

    public function cachedChat(string $cacheKey, $messages, array $options = [], int $ttl = 3600): string
    {
        return $this->chat($messages, $options);
    }

    public function chatWithFunctions($messages, array $functions, array $options = []): array
    {
        return [
            'message' => ['role' => 'assistant', 'content' => 'AI not available'],
            'finish_reason' => 'stop',
        ];
    }

    public function countTokens(string $text): int
    {
        return strlen($text) / 4;
    }

    public function listModels(): array
    {
        return [];
    }

    public function setDefaultModel(string $model): self
    {
        return $this;
    }

    public function setTimeout(int $timeout): self
    {
        return $this;
    }
}

<?php

namespace App\Services\AI;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ClaudeAIClient implements AiClientInterface
{
    protected ?string $apiKey;

    protected string $baseUrl = 'https://api.anthropic.com/v1';

    protected string $defaultModel = 'claude-sonnet-4-20250514';

    protected string $apiVersion = '2023-06-01';

    protected int $timeout = 60;

    public function __construct()
    {
        $this->apiKey = config('services.anthropic.api_key');
    }

    // ── chat ──────────────────────────────────────────────────────────────

    public function chat($messages, array $options = []): string
    {
        [$system, $normalised] = $this->normaliseMessages($messages);

        $payload = [
            'model' => $options['model'] ?? $this->defaultModel,
            'max_tokens' => $options['max_tokens'] ?? 1024,
            'messages' => $normalised,
        ];

        if ($system) {
            $payload['system'] = $system;
        }

        if (isset($options['temperature'])) {
            $payload['temperature'] = $options['temperature'];
        }

        if (isset($options['top_p'])) {
            $payload['top_p'] = $options['top_p'];
        }

        if (isset($options['stop'])) {
            $payload['stop_sequences'] = (array) $options['stop'];
        }

        try {
            $response = $this->makeRequest('POST', '/messages', $payload);

            if (empty($response['content'][0]['text'])) {
                throw new \Exception('Empty response from Claude API');
            }

            return trim($response['content'][0]['text']);

        } catch (\Exception $e) {
            Log::error('Claude chat request failed', [
                'error' => $e->getMessage(),
                'messages' => $messages,
            ]);

            throw new \Exception('Failed to get response from Claude: '.$e->getMessage());
        }
    }

    // ── chatStream ────────────────────────────────────────────────────────

    public function chatStream($messages, callable $callback, array $options = []): void
    {
        [$system, $normalised] = $this->normaliseMessages($messages);

        $payload = [
            'model' => $options['model'] ?? $this->defaultModel,
            'max_tokens' => $options['max_tokens'] ?? 1024,
            'messages' => $normalised,
            'stream' => true,
        ];

        if ($system) {
            $payload['system'] = $system;
        }

        try {
            $response = Http::timeout($this->timeout)
                ->withHeaders($this->headers())
                ->withOptions(['stream' => true])
                ->post($this->baseUrl.'/messages', $payload);

            $body = $response->getBody();

            while (! $body->eof()) {
                $line = trim($body->read(1024));

                if (str_starts_with($line, 'data: ')) {
                    $data = substr($line, 6);

                    if (trim($data) === '[DONE]') {
                        break;
                    }

                    $json = json_decode($data, true);

                    if (isset($json['delta']['text'])) {
                        $callback($json['delta']['text']);
                    }
                }
            }

        } catch (\Exception $e) {
            Log::error('Claude streaming request failed', ['error' => $e->getMessage()]);
            throw $e;
        }
    }

    // ── embeddings ────────────────────────────────────────────────────────
    // Claude does not expose an embeddings endpoint; throw so callers know.

    public function embeddings($input, string $model = 'text-embedding-ada-002'): array
    {
        throw new \Exception('Claude does not provide an embeddings endpoint. Use a dedicated embedding service.');
    }

    // ── imageGeneration ───────────────────────────────────────────────────

    public function imageGeneration(string $prompt, array $options = []): array
    {
        throw new \Exception('Claude does not provide an image generation endpoint.');
    }

    // ── moderation ────────────────────────────────────────────────────────
    // Approximate via a short safety-check prompt.

    public function moderation(string $content): array
    {
        try {
            $result = $this->chat([
                ['role' => 'user', 'content' => "Is the following content safe and appropriate? Reply with JSON only: {\"flagged\": true|false, \"reason\": \"...\"}.\n\nContent: ".$content],
            ], ['max_tokens' => 100, 'temperature' => 0]);

            $json = json_decode($result, true);

            return [
                'flagged' => $json['flagged'] ?? false,
                'categories' => [],
                'reason' => $json['reason'] ?? '',
            ];
        } catch (\Exception $e) {
            return ['flagged' => false, 'categories' => [], 'reason' => ''];
        }
    }

    // ── cachedChat ────────────────────────────────────────────────────────

    public function cachedChat(string $cacheKey, $messages, array $options = [], int $ttl = 3600): string
    {
        return Cache::remember($cacheKey, $ttl, function () use ($messages, $options) {
            return $this->chat($messages, $options);
        });
    }

    // ── chatWithFunctions ─────────────────────────────────────────────────
    // Maps OpenAI "functions" to Claude tool_use.

    public function chatWithFunctions($messages, array $functions, array $options = []): array
    {
        [$system, $normalised] = $this->normaliseMessages($messages);

        // Convert OpenAI function schema → Claude tool schema
        $tools = array_map(fn ($fn) => [
            'name' => $fn['name'],
            'description' => $fn['description'] ?? '',
            'input_schema' => $fn['parameters'] ?? ['type' => 'object', 'properties' => []],
        ], $functions);

        $payload = [
            'model' => $options['model'] ?? $this->defaultModel,
            'max_tokens' => $options['max_tokens'] ?? 1024,
            'messages' => $normalised,
            'tools' => $tools,
        ];

        if ($system) {
            $payload['system'] = $system;
        }

        try {
            $response = $this->makeRequest('POST', '/messages', $payload);

            $stopReason = $response['stop_reason'] ?? 'end_turn';

            // Build an OpenAI-compatible return shape
            if ($stopReason === 'tool_use') {
                $toolBlock = collect($response['content'])->firstWhere('type', 'tool_use');

                return [
                    'finish_reason' => 'function_call',
                    'message' => [
                        'role' => 'assistant',
                        'content' => null,
                        'function_call' => [
                            'name' => $toolBlock['name'],
                            'arguments' => json_encode($toolBlock['input']),
                        ],
                    ],
                ];
            }

            $textBlock = collect($response['content'])->firstWhere('type', 'text');

            return [
                'finish_reason' => 'stop',
                'message' => [
                    'role' => 'assistant',
                    'content' => $textBlock['text'] ?? '',
                ],
            ];

        } catch (\Exception $e) {
            Log::error('Claude function/tool calling failed', ['error' => $e->getMessage()]);
            throw new \Exception('Failed to process tool calling: '.$e->getMessage());
        }
    }

    // ── helpers ───────────────────────────────────────────────────────────

    public function countTokens(string $text): int
    {
        // Rough approximation: 1 token ≈ 4 characters
        return (int) ceil(strlen($text) / 4);
    }

    public function listModels(): array
    {
        return [
            'claude-opus-4-5',
            'claude-sonnet-4-20250514',
            'claude-haiku-4-5-20251001',
        ];
    }

    public function setDefaultModel(string $model): self
    {
        $this->defaultModel = $model;

        return $this;
    }

    public function setTimeout(int $timeout): self
    {
        $this->timeout = $timeout;

        return $this;
    }

    // ── static message builders (mirrors OpenAIClient) ────────────────────

    public static function systemMessage(string $content): array
    {
        return ['role' => 'system', 'content' => $content];
    }

    public static function userMessage(string $content): array
    {
        return ['role' => 'user', 'content' => $content];
    }

    public static function assistantMessage(string $content): array
    {
        return ['role' => 'assistant', 'content' => $content];
    }

    // ── internals ─────────────────────────────────────────────────────────

    protected function headers(): array
    {
        return [
            'x-api-key' => $this->apiKey,
            'anthropic-version' => $this->apiVersion,
            'content-type' => 'application/json',
        ];
    }

    protected function makeRequest(string $method, string $endpoint, array $data = []): array
    {
        if (empty($this->apiKey)) {
            throw new \Exception('Anthropic API key is not configured. Please set ANTHROPIC_API_KEY in your .env file.');
        }

        $response = Http::timeout($this->timeout)
            ->withHeaders($this->headers())
            ->send($method, $this->baseUrl.$endpoint, ['json' => $data]);

        if (! $response->successful()) {
            $error = $response->json('error.message') ?? $response->body();
            throw new \Exception('Claude API error: '.$error);
        }

        return $response->json();
    }

    /**
     * Split a messages array into a system prompt string + user/assistant turns.
     * Claude requires the system prompt as a top-level field, not inside messages[].
     *
     * @param  string|array  $messages
     * @return array{0: string|null, 1: array}
     */
    protected function normaliseMessages($messages): array
    {
        if (is_string($messages)) {
            return [null, [['role' => 'user', 'content' => $messages]]];
        }

        $system = null;
        $filtered = [];

        foreach ($messages as $msg) {
            if (($msg['role'] ?? '') === 'system') {
                // Concatenate multiple system messages
                $system = ($system ? $system."\n\n" : '').$msg['content'];
            } else {
                $filtered[] = $msg;
            }
        }

        // Claude requires the conversation to start with a user turn
        if (empty($filtered)) {
            $filtered[] = ['role' => 'user', 'content' => ''];
        }

        return [$system, $filtered];
    }
}

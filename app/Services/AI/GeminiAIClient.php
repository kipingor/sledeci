<?php

namespace App\Services\AI;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Google Gemini (Generative Language API) client.
 *
 * Free-tier friendly models (as of 2026): gemini-2.0-flash, gemini-1.5-flash,
 * gemini-1.5-flash-8b. Get a key at https://aistudio.google.com/apikey
 *
 * Docs: https://ai.google.dev/gemini-api/docs
 */
class GeminiAIClient implements AiClientInterface
{
    protected ?string $apiKey;

    protected string $baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

    /** Default chat model — Flash is the free-tier workhorse. */
    protected string $defaultModel = 'gemini-2.0-flash';

    protected string $defaultEmbeddingModel = 'text-embedding-004';

    protected int $timeout = 60;

    public function __construct()
    {
        $this->apiKey = config('services.gemini.api_key')
            ?: config('services.gemini.api_key');

        if ($model = config('services.gemini.model')) {
            $this->defaultModel = $model;
        }
    }

    public function chat($messages, array $options = []): string
    {
        $model = $options['model'] ?? $this->defaultModel;
        $payload = $this->buildGenerateContentPayload($messages, $options);

        $response = $this->makeRequest(
            'POST',
            "/models/{$model}:generateContent",
            $payload
        );

        $text = $this->extractText($response);
        if ($text === null) {
            throw new \RuntimeException('Invalid response from Gemini API');
        }

        return trim($text);
    }

    public function chatStream($messages, callable $callback, array $options = []): void
    {
        // Stream endpoint: streamGenerateContent — fall back to one-shot if stream fails
        try {
            $model = $options['model'] ?? $this->defaultModel;
            $payload = $this->buildGenerateContentPayload($messages, $options);

            $response = Http::timeout($this->timeout)
                ->withQueryParameters(['alt' => 'sse'])
                ->withHeaders([
                    'Content-Type' => 'application/json',
                    'x-goog-api-key' => $this->requireKey(),
                ])
                ->post("{$this->baseUrl}/models/{$model}:streamGenerateContent", $payload);

            if (! $response->successful()) {
                $callback($this->chat($messages, $options));

                return;
            }

            // SSE or JSON array of chunks
            $body = $response->body();
            if (str_contains($body, 'data:')) {
                foreach (preg_split("/\r\n|\n|\r/", $body) as $line) {
                    $line = trim($line);
                    if (! str_starts_with($line, 'data:')) {
                        continue;
                    }
                    $json = trim(substr($line, 5));
                    if ($json === '' || $json === '[DONE]') {
                        continue;
                    }
                    $chunk = json_decode($json, true);
                    $piece = $this->extractText($chunk ?? []);
                    if ($piece !== null && $piece !== '') {
                        $callback($piece);
                    }
                }

                return;
            }

            $callback($this->extractText($response->json() ?? []) ?? $this->chat($messages, $options));
        } catch (\Throwable $e) {
            Log::warning('Gemini stream failed, falling back to chat()', ['error' => $e->getMessage()]);
            $callback($this->chat($messages, $options));
        }
    }

    public function embeddings($input, string $model = 'text-embedding-ada-002'): array
    {
        $geminiModel = str_contains($model, 'embedding') && ! str_starts_with($model, 'text-embedding-ada')
            ? $model
            : $this->defaultEmbeddingModel;

        $texts = is_array($input) ? $input : [$input];
        $vectors = [];

        foreach ($texts as $text) {
            $response = $this->makeRequest(
                'POST',
                "/models/{$geminiModel}:embedContent",
                [
                    'content' => [
                        'parts' => [['text' => (string) $text]],
                    ],
                ]
            );

            $vectors[] = $response['embedding']['values']
                ?? $response['embeddings'][0]['values']
                ?? [];
        }

        return $vectors;
    }

    public function imageGeneration(string $prompt, array $options = []): array
    {
        // Imagen via Gemini API is limited on free tier — log and return empty
        Log::info('Gemini imageGeneration is not enabled on the free tier path; returning empty.');

        return [];
    }

    public function moderation(string $content): array
    {
        // No dedicated free moderation endpoint — heuristic pass-through
        return [
            'flagged' => false,
            'categories' => [],
            'provider' => 'gemini-passthrough',
        ];
    }

    public function cachedChat(string $cacheKey, $messages, array $options = [], int $ttl = 3600): string
    {
        return Cache::remember("gemini:chat:{$cacheKey}", $ttl, function () use ($messages, $options) {
            return $this->chat($messages, $options);
        });
    }

    public function chatWithFunctions($messages, array $functions, array $options = []): array
    {
        // Map OpenAI-style functions → Gemini functionDeclarations tools
        $declarations = [];
        foreach ($functions as $fn) {
            $name = $fn['name'] ?? $fn['function']['name'] ?? null;
            if (! $name) {
                continue;
            }
            $declarations[] = [
                'name' => $name,
                'description' => $fn['description'] ?? $fn['function']['description'] ?? '',
                'parameters' => $fn['parameters'] ?? $fn['function']['parameters'] ?? [
                    'type' => 'object',
                    'properties' => new \stdClass,
                ],
            ];
        }

        $payload = $this->buildGenerateContentPayload($messages, $options);
        if ($declarations !== []) {
            $payload['tools'] = [
                ['functionDeclarations' => $declarations],
            ];
        }

        $model = $options['model'] ?? $this->defaultModel;
        $response = $this->makeRequest(
            'POST',
            "/models/{$model}:generateContent",
            $payload
        );

        $candidate = $response['candidates'][0] ?? [];
        $parts = $candidate['content']['parts'] ?? [];

        foreach ($parts as $part) {
            if (isset($part['functionCall'])) {
                return [
                    'message' => [
                        'role' => 'assistant',
                        'content' => null,
                        'function_call' => [
                            'name' => $part['functionCall']['name'] ?? '',
                            'arguments' => json_encode($part['functionCall']['args'] ?? []),
                        ],
                    ],
                    'finish_reason' => 'function_call',
                    'raw' => $response,
                ];
            }
        }

        return [
            'message' => [
                'role' => 'assistant',
                'content' => $this->extractText($response) ?? '',
            ],
            'finish_reason' => 'stop',
            'raw' => $response,
        ];
    }

    public function countTokens(string $text): int
    {
        // Rough estimate if count API unavailable
        try {
            $model = $this->defaultModel;
            $response = $this->makeRequest(
                'POST',
                "/models/{$model}:countTokens",
                [
                    'contents' => [
                        ['role' => 'user', 'parts' => [['text' => $text]]],
                    ],
                ]
            );

            return (int) ($response['totalTokens'] ?? max(1, (int) ceil(strlen($text) / 4)));
        } catch (\Throwable) {
            return max(1, (int) ceil(strlen($text) / 4));
        }
    }

    public function listModels(): array
    {
        try {
            $response = $this->makeRequest('GET', '/models');
            $names = [];
            foreach ($response['models'] ?? [] as $model) {
                $name = $model['name'] ?? '';
                $names[] = str_starts_with($name, 'models/') ? substr($name, 7) : $name;
            }

            return $names;
        } catch (\Throwable $e) {
            Log::warning('Gemini listModels failed', ['error' => $e->getMessage()]);

            return [
                'gemini-2.0-flash',
                'gemini-1.5-flash',
                'gemini-1.5-flash-8b',
                'gemini-1.5-pro',
            ];
        }
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

    /**
     * @param  string|array<int, array{role?: string, content?: string}>  $messages
     * @return array<string, mixed>
     */
    protected function buildGenerateContentPayload($messages, array $options): array
    {
        if (is_string($messages)) {
            $messages = [['role' => 'user', 'content' => $messages]];
        }

        $systemInstruction = null;
        $contents = [];

        foreach ($messages as $message) {
            $role = $message['role'] ?? 'user';
            $content = $message['content'] ?? '';

            if ($role === 'system') {
                $systemInstruction = is_string($content) ? $content : json_encode($content);

                continue;
            }

            // Gemini uses "user" | "model" (not "assistant")
            $geminiRole = $role === 'assistant' ? 'model' : 'user';

            $contents[] = [
                'role' => $geminiRole,
                'parts' => [
                    ['text' => is_string($content) ? $content : json_encode($content)],
                ],
            ];
        }

        if ($contents === []) {
            $contents[] = [
                'role' => 'user',
                'parts' => [['text' => '']],
            ];
        }

        $payload = [
            'contents' => $contents,
            'generationConfig' => [
                'temperature' => $options['temperature'] ?? 0.7,
                'maxOutputTokens' => $options['max_tokens'] ?? $options['maxOutputTokens'] ?? 2048,
            ],
        ];

        if ($systemInstruction) {
            $payload['systemInstruction'] = [
                'parts' => [['text' => $systemInstruction]],
            ];
        }

        if (isset($options['top_p'])) {
            $payload['generationConfig']['topP'] = $options['top_p'];
        }

        if (isset($options['stop'])) {
            $payload['generationConfig']['stopSequences'] = (array) $options['stop'];
        }

        return $payload;
    }

    /**
     * @param  array<string, mixed>  $response
     */
    protected function extractText(array $response): ?string
    {
        $parts = $response['candidates'][0]['content']['parts'] ?? null;
        if (! is_array($parts)) {
            return null;
        }

        $chunks = [];
        foreach ($parts as $part) {
            if (isset($part['text'])) {
                $chunks[] = $part['text'];
            }
        }

        return $chunks === [] ? null : implode('', $chunks);
    }

    protected function requireKey(): string
    {
        if (empty($this->apiKey)) {
            throw new \RuntimeException(
                'Gemini API key is not configured. Set GEMINI_API_KEY in .env (https://aistudio.google.com/apikey).'
            );
        }

        return $this->apiKey;
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    protected function makeRequest(string $method, string $endpoint, array $data = []): array
    {
        $key = $this->requireKey();

        $request = Http::timeout($this->timeout)
            ->withHeaders(['x-goog-api-key' => $key])
            ->acceptJson()
            ->asJson();

        $url = $this->baseUrl.$endpoint;

        $response = $method === 'GET'
            ? $request->get($url)
            : $request->send($method, $url, ['json' => $data]);

        if (! $response->successful()) {
            $body = $response->json();
            $message = $body['error']['message'] ?? $response->body();
            Log::error('Gemini API error', [
                'status' => $response->status(),
                'message' => $message,
                'endpoint' => $endpoint,
            ]);
            throw new \RuntimeException('Gemini API error: '.$message);
        }

        return $response->json() ?? [];
    }
}

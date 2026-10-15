<?php

namespace App\Services\AI;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

class OpenAIClient implements AiClientInterface
{
    /**
     * OpenAI API key
     */
    protected ?string $apiKey;

    /**
     * OpenAI API base URL
     */
    protected string $baseUrl = 'https://api.openai.com/v1';

    /**
     * Default model
     */
    protected string $defaultModel = 'gpt-5';

    /**
     * Request timeout in seconds
     */
    protected int $timeout = 60;

    /**
     * Create a new OpenAI client instance
     */
    public function __construct()
    {
        $this->apiKey = config('services.openai.api_key');
        
        // Don't throw exception in constructor - allow lazy initialization
        // Exception will be thrown when actually trying to use the client
    }

    /**
     * Send a chat completion request
     *
     * @param string|array $messages Either a string prompt or array of messages
     * @param array $options Additional options (model, temperature, max_tokens, etc.)
     * @return string The response content
     */
    public function chat($messages, array $options = []): string
    {
        // Convert string to messages array
        if (is_string($messages)) {
            $messages = [
                ['role' => 'user', 'content' => $messages]
            ];
        }

        $payload = [
            'model' => $options['model'] ?? $this->defaultModel,
            'messages' => $messages,
            'temperature' => $options['temperature'] ?? 0.7,
            'max_tokens' => $options['max_tokens'] ?? 1000,
        ];

        // Add optional parameters
        if (isset($options['top_p'])) {
            $payload['top_p'] = $options['top_p'];
        }

        if (isset($options['frequency_penalty'])) {
            $payload['frequency_penalty'] = $options['frequency_penalty'];
        }

        if (isset($options['presence_penalty'])) {
            $payload['presence_penalty'] = $options['presence_penalty'];
        }

        if (isset($options['stop'])) {
            $payload['stop'] = $options['stop'];
        }

        try {
            $response = $this->makeRequest('POST', '/chat/completions', $payload);

            if (!isset($response['choices'][0]['message']['content'])) {
                throw new \Exception('Invalid response from OpenAI API');
            }

            return trim($response['choices'][0]['message']['content']);

        } catch (\Exception $e) {
            Log::error('OpenAI chat request failed', [
                'error' => $e->getMessage(),
                'messages' => $messages,
            ]);

            throw new \Exception('Failed to get response from OpenAI: ' . $e->getMessage());
        }
    }

    /**
     * Send a streaming chat completion request
     *
     * @param string|array $messages Either a string prompt or array of messages
     * @param callable $callback Callback function to handle each chunk
     * @param array $options Additional options
     * @return void
     */
    public function chatStream($messages, callable $callback, array $options = []): void
    {
        if (is_string($messages)) {
            $messages = [
                ['role' => 'user', 'content' => $messages]
            ];
        }

        $payload = [
            'model' => $options['model'] ?? $this->defaultModel,
            'messages' => $messages,
            'temperature' => $options['temperature'] ?? 0.7,
            'max_tokens' => $options['max_tokens'] ?? 1000,
            'stream' => true,
        ];

        try {
            $response = Http::timeout($this->timeout)
                ->withHeaders([
                    'Authorization' => 'Bearer ' . $this->apiKey,
                    'Content-Type' => 'application/json',
                ])
                ->withOptions(['stream' => true])
                ->post($this->baseUrl . '/chat/completions', $payload);

            $body = $response->getBody();

            while (!$body->eof()) {
                $line = $body->read(1024);
                
                if (strpos($line, 'data: ') === 0) {
                    $data = substr($line, 6);
                    
                    if (trim($data) === '[DONE]') {
                        break;
                    }

                    $json = json_decode($data, true);
                    
                    if (isset($json['choices'][0]['delta']['content'])) {
                        $callback($json['choices'][0]['delta']['content']);
                    }
                }
            }

        } catch (\Exception $e) {
            Log::error('OpenAI streaming request failed', [
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * Create an embedding for text
     *
     * @param string|array $input Text or array of texts to embed
     * @param string $model Embedding model to use
     * @return array Array of embeddings
     */
    public function embeddings($input, string $model = 'text-embedding-ada-002'): array
    {
        $payload = [
            'model' => $model,
            'input' => $input,
        ];

        try {
            $response = $this->makeRequest('POST', '/embeddings', $payload);

            return $response['data'];

        } catch (\Exception $e) {
            Log::error('OpenAI embeddings request failed', [
                'error' => $e->getMessage(),
            ]);

            throw new \Exception('Failed to create embeddings: ' . $e->getMessage());
        }
    }

    /**
     * Generate an image from a text prompt
     *
     * @param string $prompt The text prompt
     * @param array $options Additional options (size, n, response_format)
     * @return array Array of image URLs or base64 data
     */
    public function imageGeneration(string $prompt, array $options = []): array
    {
        $payload = [
            'prompt' => $prompt,
            'n' => $options['n'] ?? 1,
            'size' => $options['size'] ?? '1024x1024',
            'response_format' => $options['response_format'] ?? 'url',
        ];

        try {
            $response = $this->makeRequest('POST', '/images/generations', $payload);

            return $response['data'];

        } catch (\Exception $e) {
            Log::error('OpenAI image generation failed', [
                'error' => $e->getMessage(),
                'prompt' => $prompt,
            ]);

            throw new \Exception('Failed to generate image: ' . $e->getMessage());
        }
    }

    /**
     * Moderate content for safety
     *
     * @param string $content Content to moderate
     * @return array Moderation results
     */
    public function moderation(string $content): array
    {
        $payload = [
            'input' => $content,
        ];

        try {
            $response = $this->makeRequest('POST', '/moderations', $payload);

            return $response['results'][0];

        } catch (\Exception $e) {
            Log::error('OpenAI moderation request failed', [
                'error' => $e->getMessage(),
            ]);

            throw new \Exception('Failed to moderate content: ' . $e->getMessage());
        }
    }

    /**
     * Make a request to OpenAI API
     *
     * @param string $method HTTP method
     * @param string $endpoint API endpoint
     * @param array $data Request payload
     * @return array Response data
     */
    protected function makeRequest(string $method, string $endpoint, array $data = []): array
    {
        // Validate API key when actually making a request
        if (empty($this->apiKey)) {
            throw new \Exception('AI API key is not configured. Please set AI_API_KEY in your .env file.');
        }

        $url = $this->baseUrl . $endpoint;

        $response = Http::timeout($this->timeout)
            ->withHeaders([
                'Authorization' => 'Bearer ' . $this->apiKey,
                'Content-Type' => 'application/json',
            ])
            ->send($method, $url, [
                'json' => $data,
            ]);

        if (!$response->successful()) {
            $error = $response->json('error.message') ?? 'Unknown error';
            throw new \Exception('OpenAI API error: ' . $error);
        }

        return $response->json();
    }

    /**
     * Create a cached chat completion (useful for repeated queries)
     *
     * @param string $cacheKey Cache key
     * @param string|array $messages Messages
     * @param array $options Options
     * @param int $ttl Cache TTL in seconds (default 1 hour)
     * @return string Response content
     */
    public function cachedChat(string $cacheKey, $messages, array $options = [], int $ttl = 3600): string
    {
        return Cache::remember($cacheKey, $ttl, function () use ($messages, $options) {
            return $this->chat($messages, $options);
        });
    }

    /**
     * Generate a completion with function calling
     *
     * @param string|array $messages Messages
     * @param array $functions Available functions
     * @param array $options Options
     * @return array Response with possible function call
     */
    public function chatWithFunctions($messages, array $functions, array $options = []): array
    {
        if (is_string($messages)) {
            $messages = [
                ['role' => 'user', 'content' => $messages]
            ];
        }

        $payload = [
            'model' => $options['model'] ?? $this->defaultModel,
            'messages' => $messages,
            'functions' => $functions,
            'temperature' => $options['temperature'] ?? 0.7,
        ];

        try {
            $response = $this->makeRequest('POST', '/chat/completions', $payload);

            $choice = $response['choices'][0];

            return [
                'message' => $choice['message'],
                'finish_reason' => $choice['finish_reason'],
            ];

        } catch (\Exception $e) {
            Log::error('OpenAI function calling failed', [
                'error' => $e->getMessage(),
            ]);

            throw new \Exception('Failed to process function calling: ' . $e->getMessage());
        }
    }

    /**
     * Count tokens in text (approximate)
     *
     * @param string $text Text to count
     * @return int Approximate token count
     */
    public function countTokens(string $text): int
    {
        // Rough approximation: 1 token ≈ 4 characters
        // For exact counts, use tiktoken library
        return (int) ceil(strlen($text) / 4);
    }

    /**
     * Get available models
     *
     * @return array List of available models
     */
    public function listModels(): array
    {
        try {
            $response = $this->makeRequest('GET', '/models');

            return collect($response['data'])
                ->pluck('id')
                ->toArray();

        } catch (\Exception $e) {
            Log::error('Failed to list OpenAI models', [
                'error' => $e->getMessage(),
            ]);

            return [];
        }
    }

    /**
     * Set default model
     *
     * @param string $model Model name
     * @return self
     */
    public function setDefaultModel(string $model): self
    {
        $this->defaultModel = $model;
        return $this;
    }

    /**
     * Set request timeout
     *
     * @param int $timeout Timeout in seconds
     * @return self
     */
    public function setTimeout(int $timeout): self
    {
        $this->timeout = $timeout;
        return $this;
    }

    /**
     * Build a system message
     *
     * @param string $content System message content
     * @return array Message array
     */
    public static function systemMessage(string $content): array
    {
        return [
            'role' => 'system',
            'content' => $content,
        ];
    }

    /**
     * Build a user message
     *
     * @param string $content User message content
     * @return array Message array
     */
    public static function userMessage(string $content): array
    {
        return [
            'role' => 'user',
            'content' => $content,
        ];
    }

    /**
     * Build an assistant message
     *
     * @param string $content Assistant message content
     * @return array Message array
     */
    public static function assistantMessage(string $content): array
    {
        return [
            'role' => 'assistant',
            'content' => $content,
        ];
    }
}
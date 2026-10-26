<?php

namespace App\Services\AI;

interface AiClientInterface
{
    /**
     * Send a chat completion request
     *
     * @param string|array $messages Either a string prompt or array of messages
     * @param array $options Additional options (model, temperature, max_tokens, etc.)
     * @return string The response content
     */
    public function chat($messages, array $options = []): string;

    /**
     * Send a streaming chat completion request
     *
     * @param string|array $messages Either a string prompt or array of messages
     * @param callable $callback Callback function to handle each chunk
     * @param array $options Additional options
     * @return void
     */
    public function chatStream($messages, callable $callback, array $options = []): void;

    /**
     * Create an embedding for text
     *
     * @param string|array $input Text or array of texts to embed
     * @param string $model Embedding model to use
     * @return array Array of embeddings
     */
    public function embeddings($input, string $model = 'text-embedding-ada-002'): array;

    /**
     * Generate an image from a text prompt
     *
     * @param string $prompt The text prompt
     * @param array $options Additional options (size, n, response_format)
     * @return array Array of image URLs or base64 data
     */
    public function imageGeneration(string $prompt, array $options = []): array;

    /**
     * Moderate content for safety
     *
     * @param string $content Content to moderate
     * @return array Moderation results
     */
    public function moderation(string $content): array;

    /**
     * Create a cached chat completion
     *
     * @param string $cacheKey Cache key
     * @param string|array $messages Messages
     * @param array $options Options
     * @param int $ttl Cache TTL in seconds
     * @return string Response content
     */
    public function cachedChat(string $cacheKey, $messages, array $options = [], int $ttl = 3600): string;

    /**
     * Generate a completion with function calling
     *
     * @param string|array $messages Messages
     * @param array $functions Available functions
     * @param array $options Options
     * @return array Response with possible function call
     */
    public function chatWithFunctions($messages, array $functions, array $options = []): array;

    /**
     * Count tokens in text (approximate)
     *
     * @param string $text Text to count
     * @return int Approximate token count
     */
    public function countTokens(string $text): int;

    /**
     * Get available models
     *
     * @return array List of available models
     */
    public function listModels(): array;

    /**
     * Set default model
     *
     * @param string $model Model name
     * @return self
     */
    public function setDefaultModel(string $model): self;

    /**
     * Set request timeout
     *
     * @param int $timeout Timeout in seconds
     * @return self
     */
    public function setTimeout(int $timeout): self;
}
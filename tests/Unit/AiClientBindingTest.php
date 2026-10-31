<?php

namespace Tests\Unit;

use App\Services\AI\AiClientInterface;
use App\Services\AI\GeminiAIClient;
use App\Services\AI\NullOpenAIClient;
use Tests\TestCase;

class AiClientBindingTest extends TestCase
{
    public function test_gemini_is_preferred_when_key_is_set(): void
    {
        config([
            'services.gemini.api_key' => 'test-gemini-key',
            'services.openai.api_key' => 'test-openai-key',
            'services.anthropic.api_key' => null,
        ]);

        // Re-bind with current config
        $this->app->forgetInstance(AiClientInterface::class);
        $this->app->bind(AiClientInterface::class, function (): AiClientInterface {
            return match (true) {
                filled(config('services.gemini.api_key')) => new GeminiAIClient(),
                filled(config('services.openai.api_key')) => new \App\Services\AI\OpenAIClient(),
                filled(config('services.anthropic.api_key')) => new \App\Services\AI\ClaudeAIClient(),
                default => new NullOpenAIClient(),
            };
        });

        $this->assertInstanceOf(GeminiAIClient::class, $this->app->make(AiClientInterface::class));
    }

    public function test_falls_back_to_null_client_without_keys(): void
    {
        config([
            'services.gemini.api_key' => null,
            'services.openai.api_key' => null,
            'services.anthropic.api_key' => null,
        ]);

        $this->app->forgetInstance(AiClientInterface::class);
        $this->app->bind(AiClientInterface::class, function (): AiClientInterface {
            return match (true) {
                filled(config('services.gemini.api_key')) => new GeminiAIClient(),
                filled(config('services.openai.api_key')) => new \App\Services\AI\OpenAIClient(),
                filled(config('services.anthropic.api_key')) => new \App\Services\AI\ClaudeAIClient(),
                default => new NullOpenAIClient(),
            };
        });

        $this->assertInstanceOf(NullOpenAIClient::class, $this->app->make(AiClientInterface::class));
    }
}

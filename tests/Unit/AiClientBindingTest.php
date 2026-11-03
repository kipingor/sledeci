<?php

namespace Tests\Unit;

use App\Services\AI\AiClientInterface;
use App\Services\AI\AiProviderResolver;
use App\Services\AI\GeminiAIClient;
use App\Services\AI\NullOpenAIClient;
use Tests\TestCase;

class AiClientBindingTest extends TestCase
{
    public function test_gemini_is_preferred_when_key_is_set(): void
    {
        config([
            'ai.provider' => 'auto',
            'services.gemini.api_key' => 'test-gemini-key',
            'services.openai.api_key' => 'test-openai-key',
            'services.anthropic.api_key' => null,
        ]);

        $client = (new AiProviderResolver)->resolve();

        $this->assertInstanceOf(GeminiAIClient::class, $client);
        $this->assertInstanceOf(AiClientInterface::class, $client);
    }

    public function test_falls_back_to_null_client_without_keys(): void
    {
        config([
            'ai.provider' => 'auto',
            'services.gemini.api_key' => null,
            'services.openai.api_key' => null,
            'services.anthropic.api_key' => null,
            'ai.platform_keys' => ['gemini' => null, 'openai' => null, 'anthropic' => null],
        ]);

        $client = (new AiProviderResolver)->resolve();

        $this->assertInstanceOf(NullOpenAIClient::class, $client);
    }

    public function test_container_resolves_via_provider_resolver(): void
    {
        config([
            'services.gemini.api_key' => 'test-gemini-key',
            'services.openai.api_key' => null,
            'services.anthropic.api_key' => null,
        ]);

        $this->assertInstanceOf(AiClientInterface::class, $this->app->make(AiClientInterface::class));
    }
}

<?php

namespace App\Services\AI;

use App\Models\CompanySetting;

/**
 * Resolves which AI client to use based on company preference, BYOK,
 * platform subscription keys, then global env keys.
 */
class AiProviderResolver
{
    public function resolve(): AiClientInterface
    {
        $settings = null;
        try {
            $settings = CompanySetting::current();
        } catch (\Throwable) {
            // ignore
        }

        $preferred = $settings?->ai_provider ?: config('ai.provider', 'auto');

        $order = ($preferred && $preferred !== 'auto')
            ? array_values(array_unique([$preferred, 'gemini', 'openai', 'anthropic']))
            : ['gemini', 'openai', 'anthropic'];

        foreach ($order as $provider) {
            $key = $this->keyFor($provider, $settings);
            if (! filled($key)) {
                continue;
            }

            return match ($provider) {
                'gemini' => $this->withConfig('services.gemini.api_key', $key, fn () => new GeminiAIClient),
                'openai' => $this->withConfig('services.openai.api_key', $key, fn () => new OpenAIClient),
                'anthropic' => $this->withConfig('services.anthropic.api_key', $key, fn () => new ClaudeAIClient),
                default => new NullOpenAIClient,
            };
        }

        return new NullOpenAIClient;
    }

    protected function keyFor(string $provider, ?CompanySetting $settings): ?string
    {
        $byok = match ($provider) {
            'gemini' => $settings?->ai_gemini_key,
            'openai' => $settings?->ai_openai_key,
            'anthropic' => $settings?->ai_anthropic_key,
            default => null,
        };
        if (filled($byok)) {
            return $byok;
        }

        if ($settings?->hasActiveAiSubscription()) {
            $platform = config("ai.platform_keys.{$provider}");
            if (filled($platform)) {
                return $platform;
            }
        }

        return match ($provider) {
            'gemini' => config('services.gemini.api_key'),
            'openai' => config('services.openai.api_key'),
            'anthropic' => config('services.anthropic.api_key'),
            default => null,
        };
    }

    /**
     * @param  callable(): AiClientInterface  $factory
     */
    protected function withConfig(string $configKey, string $key, callable $factory): AiClientInterface
    {
        config([$configKey => $key]);

        return $factory();
    }
}

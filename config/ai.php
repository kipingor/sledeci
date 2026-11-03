<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default / preferred provider
    |--------------------------------------------------------------------------
    | auto = first configured key (gemini → openai → anthropic)
    | gemini | openai | anthropic = force that client when its key is available
    */
    'provider' => env('AI_PROVIDER', 'auto'),

    'providers' => [
        'gemini' => [
            'label' => 'Google Gemini',
            'description' => 'Free tier available via Google AI Studio. Fast Flash models.',
            'config_key' => 'services.gemini.api_key',
            'docs_url' => 'https://aistudio.google.com/apikey',
            'free_tier' => true,
        ],
        'openai' => [
            'label' => 'OpenAI',
            'description' => 'GPT models. Requires a paid OpenAI API key.',
            'config_key' => 'services.openai.api_key',
            'docs_url' => 'https://platform.openai.com/api-keys',
            'free_tier' => false,
        ],
        'anthropic' => [
            'label' => 'Anthropic Claude',
            'description' => 'Claude models. Requires a paid Anthropic API key.',
            'config_key' => 'services.anthropic.api_key',
            'docs_url' => 'https://console.anthropic.com/',
            'free_tier' => false,
        ],
    ],

    /*
    |-------------------------------------------------------------------# Provider preference: gemini | openai | anthropic | auto
AI_PROVIDER=auto-------
    | Platform-managed keys (subscription customers)
    |--------------------------------------------------------------------------
    */
    'platform_keys' => [
        'gemini' => env('AI_PLATFORM_GEMINI_KEY'),
        'openai' => env('AI_PLATFORM_OPENAI_KEY'),
        'anthropic' => env('AI_PLATFORM_ANTHROPIC_KEY'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Subscription plans (Stripe price IDs optional)
    |--------------------------------------------------------------------------
    */
    'plans' => [
        'free' => [
            'name' => 'Free (BYOK)',
            'price_monthly' => 0,
            'stripe_price' => null,
            'features' => ['Bring your own API key', 'Gemini free tier supported'],
        ],
        'starter' => [
            'name' => 'Starter',
            'price_monthly' => 19,
            'stripe_price' => env('STRIPE_AI_PRICE_STARTER'),
            'features' => ['Platform Gemini access', 'Lead insights', 'Email drafts'],
        ],
        'pro' => [
            'name' => 'Pro',
            'price_monthly' => 49,
            'stripe_price' => env('STRIPE_AI_PRICE_PRO'),
            'features' => ['All providers via platform', 'Higher limits', 'Priority models'],
        ],
    ],

];

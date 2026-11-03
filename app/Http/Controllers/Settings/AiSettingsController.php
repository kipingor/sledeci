<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\CompanySetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class AiSettingsController extends Controller
{
    public function edit(): Response
    {
        $settings = CompanySetting::current();

        $providers = collect(config('ai.providers', []))->map(function (array $meta, string $key) use ($settings) {
            $hasByok = filled(match ($key) {
                'gemini' => $settings->ai_gemini_key,
                'openai' => $settings->ai_openai_key,
                'anthropic' => $settings->ai_anthropic_key,
                default => null,
            });
            $hasEnv = filled(config($meta['config_key'] ?? ''));
            $hasPlatform = $settings->hasActiveAiSubscription()
                && filled(config("ai.platform_keys.{$key}"));

            return [
                'id' => $key,
                'label' => $meta['label'] ?? $key,
                'description' => $meta['description'] ?? '',
                'docs_url' => $meta['docs_url'] ?? null,
                'free_tier' => (bool) ($meta['free_tier'] ?? false),
                'configured' => $hasByok || $hasEnv || $hasPlatform,
                'source' => $hasByok ? 'byok' : ($hasPlatform ? 'subscription' : ($hasEnv ? 'env' : 'none')),
            ];
        })->values();

        return Inertia::render('settings/ai', [
            'providers' => $providers,
            'plans' => config('ai.plans', []),
            'settings' => [
                'ai_provider' => $settings->ai_provider ?: config('ai.provider', 'auto'),
                'ai_plan' => $settings->ai_plan ?? 'free',
                'ai_subscription_status' => $settings->ai_subscription_status,
                'ai_subscription_ends_at' => $settings->ai_subscription_ends_at?->toIso8601String(),
                'has_gemini_key' => filled($settings->ai_gemini_key),
                'has_openai_key' => filled($settings->ai_openai_key),
                'has_anthropic_key' => filled($settings->ai_anthropic_key),
            ],
            'stripe_enabled' => filled(config('services.stripe.secret')),
        ]);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'ai_provider' => 'nullable|in:auto,gemini,openai,anthropic',
            'ai_gemini_key' => 'nullable|string|max:500',
            'ai_openai_key' => 'nullable|string|max:500',
            'ai_anthropic_key' => 'nullable|string|max:500',
            'clear_gemini_key' => 'boolean',
            'clear_openai_key' => 'boolean',
            'clear_anthropic_key' => 'boolean',
        ]);

        $settings = CompanySetting::current();
        $updates = [
            'ai_provider' => $data['ai_provider'] ?? $settings->ai_provider,
        ];

        foreach (['gemini', 'openai', 'anthropic'] as $p) {
            if ($request->boolean("clear_{$p}_key")) {
                $updates["ai_{$p}_key"] = null;
            } elseif (! empty($data["ai_{$p}_key"] ?? null)) {
                $updates["ai_{$p}_key"] = $data["ai_{$p}_key"];
            }
        }

        $settings->update($updates);

        return back()->with('success', 'AI settings saved.');
    }

    /**
     * Start Stripe Checkout for an AI plan, or activate locally when Stripe is not configured.
     */
    public function subscribe(Request $request)
    {
        $data = $request->validate([
            'plan' => 'required|in:starter,pro',
        ]);

        $plan = $data['plan'];
        $planConfig = config("ai.plans.{$plan}");
        if (! $planConfig) {
            return back()->with('error', 'Unknown plan.');
        }

        $settings = CompanySetting::current();
        $secret = config('services.stripe.secret');
        $priceId = $planConfig['stripe_price'] ?? null;

        if ($secret && $priceId) {
            return $this->redirectToStripeCheckout($settings, $plan, $priceId);
        }

        // Dev / no-Stripe path: activate plan immediately (document that production needs Stripe).
        $settings->update([
            'ai_plan' => $plan,
            'ai_subscription_status' => 'active',
            'ai_subscription_ends_at' => now()->addMonth(),
        ]);

        return back()->with(
            'success',
            filled($secret)
                ? 'Plan activated. Configure STRIPE_AI_PRICE_* for paid checkout.'
                : "{$planConfig['name']} plan activated (local mode — add Stripe keys for real billing)."
        );
    }

    public function cancelSubscription()
    {
        $settings = CompanySetting::current();

        if ($settings->ai_stripe_subscription_id && config('services.stripe.secret')) {
            try {
                Http::withBasicAuth(config('services.stripe.secret'), '')
                    ->asForm()
                    ->post('https://api.stripe.com/v1/subscriptions/'.$settings->ai_stripe_subscription_id, [
                        'cancel_at_period_end' => 'true',
                    ]);
            } catch (\Throwable $e) {
                Log::warning('Stripe cancel failed', ['error' => $e->getMessage()]);
            }
        }

        $settings->update([
            'ai_plan' => 'free',
            'ai_subscription_status' => 'canceled',
            'ai_subscription_ends_at' => now(),
        ]);

        return back()->with('success', 'AI subscription canceled. You can still use BYOK keys.');
    }

    public function checkoutSuccess(Request $request)
    {
        $sessionId = $request->query('session_id');
        if ($sessionId && config('services.stripe.secret')) {
            $session = Http::withBasicAuth(config('services.stripe.secret'), '')
                ->get("https://api.stripe.com/v1/checkout/sessions/{$sessionId}")
                ->json();

            if (($session['payment_status'] ?? '') === 'paid' || ($session['status'] ?? '') === 'complete') {
                $plan = $session['metadata']['ai_plan'] ?? 'starter';
                CompanySetting::current()->update([
                    'ai_plan' => $plan,
                    'ai_subscription_status' => 'active',
                    'ai_stripe_customer_id' => $session['customer'] ?? null,
                    'ai_stripe_subscription_id' => $session['subscription'] ?? null,
                    'ai_subscription_ends_at' => now()->addMonth(),
                ]);
            }
        }

        return redirect()->route('settings.ai')->with('success', 'Subscription updated.');
    }

    protected function redirectToStripeCheckout(CompanySetting $settings, string $plan, string $priceId)
    {
        $response = Http::withBasicAuth(config('services.stripe.secret'), '')
            ->asForm()
            ->post('https://api.stripe.com/v1/checkout/sessions', [
                'mode' => 'subscription',
                'success_url' => route('settings.ai.checkout-success', absolute: true).'?session_id={CHECKOUT_SESSION_ID}',
                'cancel_url' => route('settings.ai', absolute: true),
                'line_items' => [
                    ['price' => $priceId, 'quantity' => 1],
                ],
                'metadata' => [
                    'ai_plan' => $plan,
                    'company_setting_id' => (string) $settings->id,
                ],
            ]);

        if (! $response->successful()) {
            Log::error('Stripe checkout session failed', ['body' => $response->json()]);

            return back()->with('error', 'Could not start checkout. Check Stripe configuration.');
        }

        $url = $response->json('url');

        return $url ? redirect()->away($url) : back()->with('error', 'No checkout URL returned.');
    }
}

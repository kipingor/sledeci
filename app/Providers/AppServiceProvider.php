<?php

namespace App\Providers;

use App\Services\AI\GeminiAIClient;

use App\Models\Lead;
use App\Models\LeadDocument;
use App\Observers\LeadDocumentObserver;
use App\Observers\LeadObserver;
use App\Services\AI\AiClientInterface;
use App\Services\AI\AiProviderResolver;
use App\Services\AI\ClaudeAIClient;
use App\Services\AI\NullOpenAIClient;
use App\Services\AI\OpenAIClient;
use Carbon\CarbonImmutable;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Pick the AI backend from configuration; fall back to a no-op client so the
        // app (and the test-suite) still boots when no API key is configured.
        $this->app->bind(AiClientInterface::class, fn (): AiClientInterface => app(AiProviderResolver::class)->resolve());
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
        $this->configureRateLimiting();

        Lead::observe(LeadObserver::class);
        LeadDocument::observe(LeadDocumentObserver::class);
    }

    protected function configureRateLimiting(): void
    {
        RateLimiter::for('api', fn (Request $request) => Limit::perMinute(60)
            ->by($request->user()?->id ?: $request->ip()));
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}

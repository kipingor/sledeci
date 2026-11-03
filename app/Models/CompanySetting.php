<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

/**
 * Singleton-style company settings.
 * Always use CompanySetting::current() — never instantiate directly.
 */
class CompanySetting extends Model
{
    protected $table = 'company_settings';

    protected $fillable = [
        // Identity
        'company_name', 'company_email', 'company_phone',
        'company_address', 'company_city', 'company_country', 'company_logo_path',
        'brand_primary', 'brand_secondary', 'brand_accent', 'theme_from_logo',
        'ai_provider', 'ai_plan', 'ai_subscription_status',
        'ai_stripe_customer_id', 'ai_stripe_subscription_id', 'ai_subscription_ends_at',
        'ai_gemini_key', 'ai_openai_key', 'ai_anthropic_key',

        // Tax / KRA
        'kra_pin', 'kra_branch_name', 'kra_branch_id',
        'vat_number', 'default_vat_rate', 'vat_registered',

        // eTIMS
        'etims_enabled', 'etims_environment', 'etims_device_serial',
        'etims_branch_id', 'etims_taxpayer_pin', 'etims_device_cert',
        'etims_auto_submit', 'etims_invoice_prefix',
        'etims_last_invoice_sequence', 'etims_last_sync_at', 'etims_metadata',

        // Financial defaults
        'default_currency', 'fiscal_year_start', 'date_format',

        // Maker-checker
        'maker_checker_enabled', 'maker_checker_tenders', 'maker_checker_rfp',
        'maker_checker_invoices', 'maker_checker_purchase_orders',
        'maker_checker_min_approvals', 'maker_checker_approver_roles',

        // Notifications
        'notify_on_approval_request', 'notify_on_approval_decision',
        'notify_on_etims_failure',
    ];

    protected $casts = [
        'vat_registered'               => 'boolean',
        'default_vat_rate'             => 'decimal:2',
        'etims_enabled'                => 'boolean',
        'etims_auto_submit'            => 'boolean',
        'etims_last_invoice_sequence'  => 'integer',
        'etims_last_sync_at'           => 'datetime',
        'etims_metadata'               => 'array',
        'maker_checker_enabled'        => 'boolean',
        'maker_checker_tenders'        => 'boolean',
        'maker_checker_rfp'            => 'boolean',
        'maker_checker_invoices'       => 'boolean',
        'maker_checker_purchase_orders'=> 'boolean',
        'maker_checker_min_approvals'  => 'integer',
        'maker_checker_approver_roles' => 'array',
        'notify_on_approval_request'   => 'boolean',
        'notify_on_approval_decision'  => 'boolean',
        'notify_on_etims_failure'      => 'boolean',
        'theme_from_logo'              => 'boolean',
        'ai_subscription_ends_at'      => 'datetime',
        // BYOK keys encrypted at rest
        'ai_gemini_key'                => 'encrypted',
        'ai_openai_key'                => 'encrypted',
        'ai_anthropic_key'             => 'encrypted',
    ];

    private const CACHE_KEY = 'company_settings';

    // ── Singleton accessor ─────────────────────────────────────────────────────

    public static function current(): self
    {
        // Laravel 13 refuses to unserialize arbitrary classes from the cache
        // (cache.serializable_classes), so cache the raw attributes, not the model.
        $attributes = Cache::remember(self::CACHE_KEY, 3600, function () {
            return static::firstOrCreate([], ['company_name' => config('app.name')])->getAttributes();
        });

        return (new self)->newFromBuilder($attributes);
    }

    public static function clearCache(): void
    {
        Cache::forget(self::CACHE_KEY);
    }

    protected static function booted(): void
    {
        static::saved(fn() => static::clearCache());
        static::updated(fn() => static::clearCache());
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    public function makerCheckerEnabledFor(string $module): bool
    {
        if (! $this->maker_checker_enabled) {
            return false;
        }

        return (bool) match ($module) {
            'tenders'         => $this->maker_checker_tenders,
            'rfp'             => $this->maker_checker_rfp,
            'invoices'        => $this->maker_checker_invoices,
            'purchase_orders' => $this->maker_checker_purchase_orders,
            default           => false,
        };
    }

    public function nextEtimsSequence(): int
    {
        $this->increment('etims_last_invoice_sequence');
        return $this->etims_last_invoice_sequence;
    }

    public function logoUrl(): ?string
    {
        if (! $this->company_logo_path) {
            return null;
        }

        return \Illuminate\Support\Facades\Storage::disk('public')->url($this->company_logo_path);
    }

    /** @return array{primary: ?string, secondary: ?string, accent: ?string, logo_url: ?string, theme_from_logo: bool} */
    public function brandPalette(): array
    {
        return [
            'primary' => $this->brand_primary ?: config('company.brand_color'),
            'secondary' => $this->brand_secondary ?: config('company.brand_dark'),
            'accent' => $this->brand_accent,
            'logo_url' => $this->logoUrl(),
            'theme_from_logo' => (bool) $this->theme_from_logo,
        ];
    }

    public function hasActiveAiSubscription(): bool
    {
        if (($this->ai_plan ?? 'free') === 'free') {
            return false;
        }
        if ($this->ai_subscription_status === 'active') {
            return true;
        }
        if ($this->ai_subscription_ends_at && $this->ai_subscription_ends_at->isFuture()) {
            return true;
        }

        return false;
    }
}

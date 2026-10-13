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
    ];

    private const CACHE_KEY = 'company_settings';

    // ── Singleton accessor ─────────────────────────────────────────────────────

    public static function current(): self
    {
        return Cache::remember(self::CACHE_KEY, 3600, function () {
            return static::firstOrCreate([], ['company_name' => config('app.name')]);
        });
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
}

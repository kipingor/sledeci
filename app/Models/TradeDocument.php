<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Sledeci\Accounting\Models\Invoice;

class TradeDocument extends Model
{
    use SoftDeletes;

    /** EAC member states — pre-fills "origin_region" when origin is one of these */
    public const EAC_COUNTRIES = ['KE', 'UG', 'TZ', 'RW', 'BI', 'SS', 'CD'];

    /** COMESA member states (subset most relevant to East/Southern Africa) */
    public const COMESA_COUNTRIES = [
        'KE', 'UG', 'RW', 'BI', 'CD', 'DJ', 'EG', 'ER', 'SZ', 'ET',
        'LY', 'MG', 'MW', 'MU', 'SC', 'SD', 'TN', 'ZM', 'ZW', 'KM',
    ];

    protected $fillable = [
        'document_number', 'invoice_id', 'purchase_order_id', 'created_by',
        'type', 'trade_direction',
        'origin_country', 'destination_country', 'origin_region',
        'exporter_name', 'exporter_address', 'exporter_kra_pin',
        'importer_name', 'importer_address', 'importer_tax_id',
        'transport_mode', 'vehicle_reg', 'border_post', 'departure_date',
        'items', 'total_value', 'currency',
        'total_gross_weight', 'total_net_weight',
        'status', 'certifying_authority', 'certificate_reference',
        'certified_date', 'valid_until',
        'notes', 'document_path',
    ];

    protected $casts = [
        'items'               => 'array',
        'total_value'         => 'decimal:2',
        'total_gross_weight'  => 'decimal:3',
        'total_net_weight'    => 'decimal:3',
        'departure_date'      => 'date',
        'certified_date'      => 'date',
        'valid_until'         => 'date',
    ];

    // ── Relations ──────────────────────────────────────────────────────────

    public function invoice(): BelongsTo       { return $this->belongsTo(Invoice::class); }
    public function purchaseOrder(): BelongsTo { return $this->belongsTo(PurchaseOrder::class); }
    public function creator(): BelongsTo       { return $this->belongsTo(User::class, 'created_by'); }

    // ── Helpers ────────────────────────────────────────────────────────────

    public static function generateDocumentNumber(string $type): string
    {
        $prefix = match ($type) {
            'certificate_of_origin' => 'COO',
            'customs_declaration'   => 'CD',
            'proforma_invoice'      => 'PFI',
            'packing_list'          => 'PL',
            default                 => 'TD',
        };
        $date = now()->format('Ymd');
        $last = static::where('document_number', 'like', "{$prefix}-{$date}%")->orderByDesc('id')->first();
        $seq  = $last ? ((int) substr($last->document_number, -4)) + 1 : 1;
        return "{$prefix}-{$date}-" . str_pad((string) $seq, 4, '0', STR_PAD_LEFT);
    }

    public function isEacTrade(): bool
    {
        return in_array($this->origin_country, self::EAC_COUNTRIES)
            && in_array($this->destination_country, self::EAC_COUNTRIES);
    }

    public function isComesaTrade(): bool
    {
        return in_array($this->origin_country, self::COMESA_COUNTRIES)
            && in_array($this->destination_country, self::COMESA_COUNTRIES);
    }

    public function suggestedRegion(): ?string
    {
        if ($this->isEacTrade())    return 'EAC';
        if ($this->isComesaTrade()) return 'COMESA';
        return null;
    }

    public function isCertified(): bool
    {
        return $this->status === 'certified';
    }

    public function isExpired(): bool
    {
        return $this->valid_until && $this->valid_until->isPast();
    }
}

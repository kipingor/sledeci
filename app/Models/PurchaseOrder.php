<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PurchaseOrder extends Model
{
    use SoftDeletes;
    protected $fillable = ['number','supplier_id','project_id','client_id','created_by','status','order_date','expected_delivery_date','currency','subtotal','tax','total','lines','notes','shipping_address'];
    protected $casts = ['lines'=>'array','subtotal'=>'decimal:2','tax'=>'decimal:2','total'=>'decimal:2','order_date'=>'date','expected_delivery_date'=>'date'];

    protected static function booted(): void {
        static::creating(function (PurchaseOrder $po) {
            if (empty($po->number)) {
                $year = now()->year;
                $count = static::whereYear('created_at', $year)->withTrashed()->count() + 1;
                $po->number = sprintf('PO-%d-%04d', $year, $count);
            }
        });
    }

    public function supplier(): BelongsTo   { return $this->belongsTo(Supplier::class); }
    public function project(): BelongsTo    { return $this->belongsTo(Project::class); }
    public function client(): BelongsTo     { return $this->belongsTo(User::class, 'client_id'); }
    public function creator(): BelongsTo    { return $this->belongsTo(User::class, 'created_by'); }
    public function deliveries(): HasMany   { return $this->hasMany(Delivery::class); }
    public function documents(): HasMany    { return $this->hasMany(DeliveryDocument::class); }
}

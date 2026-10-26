<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeliveryDocument extends Model
{
    use SoftDeletes;
    protected $fillable = ['delivery_id','purchase_order_id','supplier_id','uploaded_by','type','title','file_path','file_name','mime_type','file_size','status','notes','approved_by','approved_at'];
    protected $casts = ['approved_at'=>'datetime','file_size'=>'integer'];

    public function delivery(): BelongsTo      { return $this->belongsTo(Delivery::class); }
    public function purchaseOrder(): BelongsTo { return $this->belongsTo(PurchaseOrder::class); }
    public function uploader(): BelongsTo      { return $this->belongsTo(User::class, 'uploaded_by'); }
    public function approver(): BelongsTo      { return $this->belongsTo(User::class, 'approved_by'); }
}

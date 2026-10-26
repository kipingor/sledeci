<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Supplier extends Model
{
    use HasFactory, SoftDeletes;
    protected $fillable = [
        'name','email','phone','address','website','contact_person',
        'payment_terms','category','rating','notes','active',
        'contact_info','products','metadata',
    ];
    protected $casts = ['rating'=>'float','active'=>'boolean','contact_info'=>'array','products'=>'array','metadata'=>'array'];

    public function productCatalog(): HasMany   { return $this->hasMany(Product::class); }
    public function purchaseOrders(): HasMany   { return $this->hasMany(PurchaseOrder::class); }
}

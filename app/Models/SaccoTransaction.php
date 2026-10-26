<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SaccoTransaction extends Model
{
    protected $fillable = [
        'sacco_account_id', 'created_by', 'type', 'amount', 'balance_after',
        'reference', 'notes', 'transacted_at',
    ];
 
    protected $casts = [
        'amount'        => 'decimal:2',
        'balance_after' => 'decimal:2',
        'transacted_at' => 'datetime',
    ];
 
    public function account(): BelongsTo { return $this->belongsTo(SaccoAccount::class); }
    public function creator(): BelongsTo { return $this->belongsTo(User::class, 'created_by'); }
}

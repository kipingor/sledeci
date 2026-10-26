<?php

namespace Sledeci\Accounting\Models;

use Illuminate\Database\Eloquent\Model;

class ForexRate extends Model
{
    protected $fillable = [
        'base_currency', 'quote_currency', 'rate', 'rate_buy', 'rate_sell',
        'source', 'fetched_at',
    ];

    protected $casts = [
        'rate' => 'decimal:8',
        'rate_buy' => 'decimal:8',
        'rate_sell' => 'decimal:8',
        'fetched_at' => 'datetime',
    ];

    /**
     * Get the inverse rate: if this is KES→USD, returns USD→KES
     */
    public function inverse(): float
    {
        return $this->rate > 0 ? round(1 / (float) $this->rate, 8) : 0;
    }
}

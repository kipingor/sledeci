<?php

namespace Sledeci\Accounting\Models;

use Illuminate\Database\Eloquent\Model;

class TaxCode extends Model
{
    protected $fillable = [
        'code',
        'name',
        'type',
        'rate',
        'input_account_id',
        'output_account_id',
        'is_active',
        'is_default',
        'jurisdiction',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'is_default' => 'boolean',
    ];
}

<?php

namespace Sledeci\KenyaPayroll\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PayslipDeduction extends Model
{
    /** @use HasFactory<\Database\Factories\PayslipDeductionFactory> */
    use HasFactory;

    /**
     * Factories stay in database/factories (Database\\Factories), outside this package.
     */
    protected static function newFactory(): \Database\Factories\PayslipDeductionFactory
    {
        return \Database\Factories\PayslipDeductionFactory::new();
    }
}

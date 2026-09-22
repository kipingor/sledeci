<?php

namespace App\Models;

use Stancl\Tenancy\Database\Models\Domain as BaseDomain;

/**
 * Central (platform-level) Domain model.
 *
 * @property int $id
 * @property string $domain
 * @property string $tenant_id
 */
class Domain extends BaseDomain
{
    //
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Stancl\Tenancy\Database\Models\Tenant as BaseTenant;
use Stancl\Tenancy\Contracts\TenantWithDatabase;
use Stancl\Tenancy\Database\Concerns\HasDatabase;
use Stancl\Tenancy\Database\Concerns\HasDomains;

/**
 * Central (platform-level) Tenant model.
 *
 * Lives in the central DB — NOT tenant-scoped itself.
 * All tenant-scoped tables reference this via tenant_id.
 *
 * @property string $id
 * @property string $name
 * @property string $slug
 * @property string $status   active|suspended|trial
 * @property string|null $plan
 * @property \Carbon\Carbon|null $trial_ends_at
 * @property \Carbon\Carbon $created_at
 * @property \Carbon\Carbon $updated_at
 */
class Tenant extends BaseTenant implements TenantWithDatabase
{
    use HasDatabase;
    use HasDomains;
    use HasFactory;

    /** Extra columns stored directly (not in the jsonb data column). */
    public static function getCustomColumns(): array
    {
        return ['id', 'name', 'slug', 'status', 'plan', 'trial_ends_at'];
    }

    protected $fillable = ['id', 'name', 'slug', 'status', 'plan', 'trial_ends_at'];

    /** @var array<string, string> */
    protected $casts = [
        'trial_ends_at' => 'datetime',
    ];

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    public function isSuspended(): bool
    {
        return $this->status === 'suspended';
    }

    public function isOnTrial(): bool
    {
        return $this->status === 'trial'
            && $this->trial_ends_at !== null
            && $this->trial_ends_at->isFuture();
    }
}

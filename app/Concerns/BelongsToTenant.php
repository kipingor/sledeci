<?php

declare(strict_types=1);

namespace App\Concerns;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Stancl\Tenancy\Facades\Tenancy;

/**
 * Applies a global Eloquent scope that automatically filters all queries
 * by the current tenant_id and auto-fills tenant_id on create.
 *
 * No controller or service should ever need ->where('tenant_id', ...).
 * If you find yourself writing that, this trait is missing from the model.
 */
trait BelongsToTenant
{
    public static function bootBelongsToTenant(): void
    {
        // Apply the tenant scope whenever the model is being queried.
        static::addGlobalScope('tenant', function (Builder $builder): void {
            if (app()->runningInConsole() && ! tenancy()->initialized) {
                return;
            }

            if (tenancy()->initialized && tenancy()->tenant !== null) {
                $builder->where(
                    (new static())->qualifyColumn('tenant_id'),
                    tenancy()->tenant->getTenantKey(),
                );
            }
        });

        // Auto-fill tenant_id when creating new records.
        static::creating(function (Model $model): void {
            if (tenancy()->initialized && tenancy()->tenant !== null) {
                /** @phpstan-ignore-next-line */
                $model->tenant_id ??= tenancy()->tenant->getTenantKey();
            }
        });
    }

    /**
     * Temporarily bypass the tenant scope for cross-tenant queries
     * (admin tools only — never expose this in tenant-facing code).
     */
    public static function withoutTenantScope(): Builder
    {
        return static::withoutGlobalScope('tenant');
    }
}

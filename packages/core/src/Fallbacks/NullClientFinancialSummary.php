<?php

namespace Sledeci\Core\Fallbacks;

use Illuminate\Support\Collection;
use Sledeci\Core\Contracts\ClientFinancialSummary;

/**
 * Used when no accounting package is installed.
 */
class NullClientFinancialSummary implements ClientFinancialSummary
{
    public function invoices(int $clientId, ?int $projectId = null, ?string $from = null, ?string $to = null, ?int $limit = null): Collection
    {
        return collect();
    }

    public function totals(int $clientId): array
    {
        return ['total_billed' => 0.0, 'total_collected' => 0.0, 'total_overdue' => 0.0];
    }
}

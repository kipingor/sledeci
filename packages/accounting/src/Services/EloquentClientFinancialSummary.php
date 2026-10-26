<?php

namespace Sledeci\Accounting\Services;

use Sledeci\Accounting\Models\Invoice;
use Illuminate\Support\Collection;
use Sledeci\Core\Contracts\ClientFinancialSummary;

/**
 * Supplies the Clients module with invoice data. Moves into the accounting
 * package when that is extracted.
 */
class EloquentClientFinancialSummary implements ClientFinancialSummary
{
    public function invoices(
        int $clientId,
        ?int $projectId = null,
        ?string $from = null,
        ?string $to = null,
        ?int $limit = null,
    ): Collection {
        $query = Invoice::where('client_id', $clientId)
            ->with('payments')
            ->orderByDesc('issue_date');

        if ($projectId) {
            $query->where('project_id', $projectId);
        }
        if ($from) {
            $query->whereDate('issue_date', '>=', $from);
        }
        if ($to) {
            $query->whereDate('issue_date', '<=', $to);
        }
        if ($limit) {
            $query->limit($limit);
        }

        return $query->get();
    }

    public function totals(int $clientId): array
    {
        return [
            'total_billed' => (float) Invoice::where('client_id', $clientId)
                ->whereNotIn('status', ['draft', 'cancelled'])->sum('total'),
            'total_collected' => (float) Invoice::where('client_id', $clientId)
                ->join('payments', 'invoices.id', 'payments.invoice_id')->sum('payments.amount'),
            'total_overdue' => (float) Invoice::where('client_id', $clientId)
                ->where('status', 'overdue')->sum('total'),
        ];
    }
}

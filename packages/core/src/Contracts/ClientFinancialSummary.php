<?php

namespace Sledeci\Core\Contracts;

use Illuminate\Support\Collection;

/**
 * What the Clients module needs to know about a client's money.
 *
 * Implemented by the accounting package. When accounting is not installed the
 * core package binds NullClientFinancialSummary, so Clients keeps working and
 * simply shows no financial data.
 */
interface ClientFinancialSummary
{
    /**
     * Invoices for a client, newest first, each with its payments loaded
     * (a `payments` collection whose items expose `amount`).
     *
     * Each item exposes at least: id, number, status, total, currency, issue_date, due_date.
     *
     * @return Collection<int, object>
     */
    public function invoices(
        int $clientId,
        ?int $projectId = null,
        ?string $from = null,
        ?string $to = null,
        ?int $limit = null,
    ): Collection;

    /**
     * @return array{total_billed: float, total_collected: float, total_overdue: float}
     */
    public function totals(int $clientId): array;
}

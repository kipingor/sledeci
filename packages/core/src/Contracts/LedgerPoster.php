<?php

namespace Sledeci\Core\Contracts;

/**
 * Posts business events to the general ledger. Implemented by accounting;
 * payroll, SACCO, POS and inventory depend on this interface only.
 */
interface LedgerPoster
{
    /**
     * Post a balanced journal. Must be idempotent for the same source.
     *
     * @param  list<array{account: string, debit?: float, credit?: float, memo?: ?string}>  $lines  account is a chart-of-accounts code
     * @param  array<string, mixed>  $meta
     * @return int|string journal entry id
     */
    public function post(string $sourceType, int|string $sourceId, array $lines, array $meta = []): int|string;

    /**
     * @return int|string id of the reversing entry
     */
    public function reverse(int|string $journalEntryId, string $reason): int|string;
}

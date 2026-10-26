<?php

namespace Sledeci\Core\Contracts;

/**
 * Something that can be invoiced to a tax authority or customer (an invoice,
 * a POS sale, a credit note). Lets kenya-tax submit to eTIMS without importing
 * the accounting package's Invoice model.
 */
interface Billable
{
    public function billableNumber(): string;

    public function billableCurrency(): string;

    public function billableTotal(): float;

    public function billableTaxTotal(): float;

    /**
     * @return array{name: ?string, tax_id: ?string, email: ?string, phone: ?string}
     */
    public function billableCustomer(): array;

    /**
     * @return iterable<int, array{description: string, quantity: float, unit_price: float, tax_rate: float, total: float}>
     */
    public function billableLines(): iterable;
}

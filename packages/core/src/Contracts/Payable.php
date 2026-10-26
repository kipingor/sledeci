<?php

namespace Sledeci\Core\Contracts;

use Carbon\CarbonInterface;

/**
 * Something money can be collected against (an invoice, a POS sale, a loan instalment).
 */
interface Payable
{
    public function payableReference(): string;

    public function payableOutstanding(): float;

    public function payableCurrency(): string;

    public function payableDueDate(): ?CarbonInterface;
}

<?php

namespace Sledeci\Core\Contracts;

/**
 * A mobile-money or card provider. kenya-payments implements this for M-Pesa,
 * Airtel Money and MTN; accounting and POS depend only on this interface and
 * react to the resulting events.
 */
interface PaymentGateway
{
    public function name(): string;

    /**
     * Ask the customer to approve a payment (for example an STK push).
     *
     * @param  array<string, mixed>  $context
     * @return array{success: bool, reference: ?string, message: ?string}
     */
    public function initiate(string $phone, float $amount, string $reference, array $context = []): array;
}

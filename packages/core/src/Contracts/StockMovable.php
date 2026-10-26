<?php

namespace Sledeci\Core\Contracts;

/**
 * Stock operations POS and delivery need, without importing inventory models.
 */
interface StockMovable
{
    public function stockOnHand(int|string $productId): float;

    /**
     * @param  float  $quantity  positive adds stock, negative removes it
     * @param  array<string, mixed>  $context
     */
    public function adjustStock(int|string $productId, float $quantity, string $reason, array $context = []): void;
}

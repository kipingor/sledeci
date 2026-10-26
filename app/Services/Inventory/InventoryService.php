<?php

namespace App\Services\Inventory;

use App\Models\Delivery;
use App\Models\Product;
use App\Models\StockMovement;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Sledeci\Accounting\Models\Invoice;

/**
 * InventoryService
 *
 * Central coordinator for all stock movements.
 *
 * Called from:
 *   DeliveryController::deliver()     → receiveFromDelivery()
 *   InvoiceController::recordPayment() → deductForInvoice()    (optional)
 *   InventoryController::adjust()      → manualAdjustment()
 *   PosController::sale()              → recordSale()
 */
class InventoryService
{
    /**
     * Record stock receipts when a delivery is confirmed.
     *
     * Iterates the delivery's items array, finds the matching Product,
     * and creates a 'receipt' movement for each line that has a product_id.
     *
     * @return int Number of products updated
     */
    public function receiveFromDelivery(Delivery $delivery): int
    {
        $items = $delivery->items ?? [];
        $updated = 0;
        $po = $delivery->purchaseOrder;

        DB::transaction(function () use ($delivery, $items, $po, &$updated) {
            foreach ($items as $item) {
                $productId = $item['product_id'] ?? null;
                $qty = (int) ($item['quantity'] ?? $item['qty'] ?? 0);

                if (! $productId || $qty <= 0) {
                    continue;
                }

                $product = Product::find($productId);
                if (! $product) {
                    continue;
                }

                $product->adjustStock(
                    quantity: $qty,
                    type: 'receipt',
                    reference: $po?->number ?? "DEL-{$delivery->number}",
                    source: $delivery,
                    notes: "Received via delivery {$delivery->number}",
                );

                // Notify if stock now above reorder point (just restocked)
                if ($product->wasLowStock && ! $product->isLowStock()) {
                    Log::info("Product {$product->name} restocked above reorder point.");
                }

                $updated++;
            }
        });

        return $updated;
    }

    /**
     * Deduct stock when an invoice is issued (optional — only if
     * CompanySetting::current()->deduct_stock_on_invoice is true).
     */
    public function deductForInvoice(Invoice $invoice): void
    {
        $lines = $invoice->lines ?? [];

        DB::transaction(function () use ($invoice, $lines) {
            foreach ($lines as $line) {
                $productId = $line['product_id'] ?? null;
                $qty = (int) ($line['quantity'] ?? 0);

                if (! $productId || $qty <= 0) {
                    continue;
                }

                $product = Product::find($productId);
                if (! $product || ! $product->active) {
                    continue;
                }

                $product->adjustStock(
                    quantity: -$qty,
                    type: 'sale',
                    reference: $invoice->number,
                    source: $invoice,
                    notes: "Sold via invoice {$invoice->number}",
                );

                // Check low-stock after deduction
                if ($product->isLowStock()) {
                    $this->notifyLowStock($product);
                }
            }
        });
    }

    /**
     * Manual stock adjustment (stocktake, correction, write-off).
     *
     * @param  int  $newQty  The correct quantity after adjustment
     * @param  string  $type  adjustment | write_off | return_in | return_out
     */
    public function manualAdjustment(
        Product $product,
        int $newQty,
        string $type = 'adjustment',
        string $reason = '',
    ): StockMovement {
        $delta = $newQty - $product->stock_qty;

        return $product->adjustStock(
            quantity: $delta,
            type: $type,
            reference: 'ADJ-'.now()->format('YmdHis'),
            notes: $reason ?: "Manual adjustment to {$newQty} units",
        );
    }

    /**
     * Record a POS sale movement for one or more line items.
     *
     * @param  array  $lines  [{product_id, quantity, unit_price}, ...]
     * @param  string  $reference  POS receipt reference
     */
    public function recordSale(array $lines, string $reference): void
    {
        DB::transaction(function () use ($lines, $reference) {
            foreach ($lines as $line) {
                $product = Product::find($line['product_id'] ?? null);
                if (! $product) {
                    continue;
                }

                $qty = (int) ($line['quantity'] ?? 1);

                $product->adjustStock(
                    quantity: -$qty,
                    type: 'sale',
                    reference: $reference,
                    notes: "POS sale — {$reference}",
                );

                if ($product->isLowStock()) {
                    $this->notifyLowStock($product);
                }
            }
        });
    }

    /**
     * Get products that are at or below their reorder point.
     *
     * @return Collection
     */
    public function getLowStockProducts()
    {
        return Product::lowStock()
            ->where('active', true)
            ->with('supplier:id,name')
            ->orderByRaw('(stock_qty - reorder_point) ASC')
            ->get();
    }

    /**
     * Get a paginated stock movement ledger for one product.
     */
    public function getMovements(Product $product, int $perPage = 30)
    {
        return $product->stockMovements()
            ->with('creator:id,name')
            ->orderByDesc('created_at')
            ->paginate($perPage);
    }

    /**
     * Calculate total stock value across all active products.
     */
    public function totalStockValue(): float
    {
        return (float) Product::where('active', true)
            ->where('stock_qty', '>', 0)
            ->selectRaw('SUM(unit_cost * stock_qty) as value')
            ->value('value');
    }

    // ── Private helpers ────────────────────────────────────────────────────

    private function notifyLowStock(Product $product): void
    {
        Log::warning("Low stock alert: {$product->name} ({$product->sku}) = {$product->stock_qty} units (reorder point: {$product->reorder_point})");
        // TODO: dispatch a LowStockNotification to admins / purchasing team
    }
}

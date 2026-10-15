<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\StockMovement;
use App\Services\Inventory\InventoryService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

/**
 * InventoryController
 *
 * Handles:
 *  - Inventory dashboard (low-stock, out-of-stock, total value)
 *  - Per-product movement ledger
 *  - Manual adjustments (stocktake, write-off, corrections)
 *  - Barcode / SKU lookup for POS and scanner
 */
class InventoryController extends Controller
{
    public function __construct(private InventoryService $inventory) {}

    // ── Dashboard ──────────────────────────────────────────────────────────

    public function index(): Response
    {
        $lowStock    = $this->inventory->getLowStockProducts();
        $outOfStock  = Product::outOfStock()->with('supplier:id,name')->get();
        $totalValue  = $this->inventory->totalStockValue();

        $recentMovements = StockMovement::with('product:id,name,sku', 'creator:id,name')
            ->orderByDesc('created_at')
            ->limit(20)
            ->get();

        $stats = [
            'total_products'  => Product::where('active', true)->count(),
            'low_stock_count' => $lowStock->count(),
            'out_of_stock'    => $outOfStock->count(),
            'total_value'     => $totalValue,
        ];

        return Inertia::render('inventory/index', compact(
            'lowStock', 'outOfStock', 'recentMovements', 'stats'
        ));
    }

    // ── Per-product movement ledger ────────────────────────────────────────

    public function movements(Request $request, Product $product): Response
    {
        $movements = $this->inventory->getMovements($product, 30);

        return Inertia::render('inventory/movements', [
            'product'   => $product->load('supplier:id,name'),
            'movements' => $movements,
        ]);
    }

    // ── Manual adjustment ──────────────────────────────────────────────────

    public function adjust(Request $request, Product $product)
    {
        $data = $request->validate([
            'new_quantity' => 'required|integer|min:0',
            'type'         => 'required|in:adjustment,write_off,return_in,return_out,transfer_in,transfer_out',
            'reason'       => 'required|string|max:500',
        ]);

        $movement = $this->inventory->manualAdjustment(
            product: $product,
            newQty:  $data['new_quantity'],
            type:    $data['type'],
            reason:  $data['reason'],
        );

        if ($request->wantsJson()) {
            return response()->json([
                'success'        => true,
                'quantity_after' => $movement->quantity_after,
                'delta'          => $movement->quantity,
            ]);
        }

        return back()->with('success', "Stock adjusted to {$movement->quantity_after} units.");
    }

    // ── Barcode / SKU lookup (used by POS and scanner) ─────────────────────

    /**
     * GET /inventory/lookup?q=BARCODE_OR_SKU
     *
     * Returns product details for a scanned barcode or typed SKU.
     * Used by the POS page and the mobile scanner component.
     */
    public function lookup(Request $request)
    {
        $q = trim($request->get('q', ''));

        if (strlen($q) < 1) {
            return response()->json(['product' => null]);
        }

        $product = Product::byBarcode($q)
            ->where('active', true)
            ->with('supplier:id,name')
            ->first();

        if (! $product) {
            return response()->json(['product' => null, 'error' => 'Product not found'], 404);
        }

        return response()->json([
            'product' => [
                'id'          => $product->id,
                'name'        => $product->name,
                'sku'         => $product->sku,
                'barcode'     => $product->barcode,
                'unit_price'  => $product->unit_price,
                'unit_cost'   => $product->unit_cost,
                'currency'    => $product->currency,
                'stock_qty'   => $product->stock_qty,
                'unit'        => $product->unit,
                'low_stock'   => $product->isLowStock(),
            ],
        ]);
    }

    // ── Stock value report ─────────────────────────────────────────────────

    /**
     * GET /inventory/valuation
     *
     * Returns a full stock valuation report grouped by category and supplier.
     */
    public function valuation(): Response
    {
        $products = Product::where('active', true)
            ->where('stock_qty', '>', 0)
            ->with('supplier:id,name')
            ->orderBy('category')
            ->orderBy('name')
            ->get()
            ->map(fn ($p) => [
                'id'          => $p->id,
                'name'        => $p->name,
                'sku'         => $p->sku,
                'category'    => $p->category,
                'supplier'    => $p->supplier?->name,
                'stock_qty'   => $p->stock_qty,
                'unit_cost'   => (float) $p->unit_cost,
                'stock_value' => $p->stockValue(),
                'currency'    => $p->currency,
            ]);

        $totalByCurrency = $products->groupBy('currency')
            ->map(fn ($g) => round($g->sum('stock_value'), 2));

        return Inertia::render('inventory/valuation', [
            'products'          => $products,
            'total_by_currency' => $totalByCurrency,
        ]);
    }
}

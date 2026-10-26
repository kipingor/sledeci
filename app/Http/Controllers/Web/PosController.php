<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\CompanySetting;
use App\Models\PosSale;
use App\Models\PosSaleItem;
use App\Models\PosShift;
use App\Models\Product;
use App\Services\Inventory\InventoryService;
use Sledeci\KenyaPayments\Services\MobileMoneyService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/**
 * PosController
 *
 * Lightweight point-of-sale for over-the-counter / retail transactions.
 * Distinct from the Invoice flow — POS sales settle immediately (cash,
 * M-Pesa, card) and deduct stock the moment the sale completes.
 *
 * Integrates with:
 *  - InventoryService::recordSale()   → deducts stock_qty per line item
 *  - MobileMoneyService               → M-Pesa STK push for card-less checkout
 *  - eTIMS (via CompanySetting)       → optional auto-submission of receipts
 */
class PosController extends Controller
{
    public function __construct(
        private InventoryService   $inventory,
        private MobileMoneyService $mobileMoney,
    ) {}

    // ── Till screen ────────────────────────────────────────────────────────

    public function index(): Response
    {
        $openShift = PosShift::where('cashier_id', Auth::id())
            ->whereNull('closed_at')
            ->latest('opened_at')
            ->first();

        $products = Product::where('active', true)
            ->where('stock_qty', '>', 0)
            ->select('id', 'name', 'sku', 'barcode', 'unit_price', 'currency', 'stock_qty', 'category', 'unit')
            ->orderBy('name')
            ->get();

        $categories = $products->pluck('category')->filter()->unique()->values();

        return Inertia::render('pos/index', [
            'products'   => $products,
            'categories' => $categories,
            'openShift'  => $openShift,
            'currency'   => CompanySetting::current()->default_currency ?? 'KES',
        ]);
    }

    // ── Shift management ──────────────────────────────────────────────────

    public function openShift(Request $request)
    {
        $existing = PosShift::where('cashier_id', Auth::id())->whereNull('closed_at')->first();
        if ($existing) {
            return back()->with('error', 'You already have an open shift.');
        }

        $data = $request->validate(['opening_float' => 'required|numeric|min:0']);

        PosShift::create([
            'cashier_id'    => Auth::id(),
            'opening_float' => $data['opening_float'],
            'opened_at'     => now(),
        ]);

        return back()->with('success', 'Shift opened.');
    }

    public function closeShift(Request $request, PosShift $shift)
    {
        if ($shift->cashier_id !== Auth::id()) abort(403);

        $data = $request->validate(['closing_float' => 'required|numeric|min:0', 'notes' => 'nullable|string']);

        $cashSales = PosSale::where('cashier_id', Auth::id())
            ->where('payment_channel', 'cash')
            ->where('status', 'completed')
            ->where('created_at', '>=', $shift->opened_at)
            ->sum('total');

        $expectedCash = (float) $shift->opening_float + (float) $cashSales;
        $variance     = (float) $data['closing_float'] - $expectedCash;

        $shift->update([
            'closing_float' => $data['closing_float'],
            'expected_cash' => $expectedCash,
            'cash_variance' => $variance,
            'closed_at'     => now(),
            'notes'         => $data['notes'] ?? null,
        ]);

        return back()->with('success', sprintf(
            'Shift closed. Expected %.2f, counted %.2f (variance: %s%.2f)',
            $expectedCash, $data['closing_float'], $variance >= 0 ? '+' : '', $variance
        ));
    }

    // ── Checkout ───────────────────────────────────────────────────────────

    public function checkout(Request $request)
    {
        $data = $request->validate([
            'items'                  => 'required|array|min:1',
            'items.*.product_id'     => 'required|exists:products,id',
            'items.*.quantity'       => 'required|integer|min:1',
            'items.*.unit_price'     => 'required|numeric|min:0',
            'items.*.discount'       => 'nullable|numeric|min:0',
            'discount'               => 'nullable|numeric|min:0',
            'tax_rate'               => 'nullable|numeric|min:0|max:100',
            'payment_channel'        => 'required|in:cash,mpesa,airtel_money,mtn_momo,card,split',
            'amount_tendered'        => 'nullable|numeric|min:0',
            'mobile_money_code'      => 'nullable|string|max:50',
            'mobile_money_phone'     => 'nullable|string|max:20',
            'client_id'              => 'nullable|exists:users,id',
            'walk_in_name'           => 'nullable|string|max:255',
            'walk_in_phone'          => 'nullable|string|max:20',
        ]);

        // ── Stock validation before committing ──────────────────────────────
        foreach ($data['items'] as $item) {
            $product = Product::find($item['product_id']);
            if (! $product || $product->stock_qty < $item['quantity']) {
                return response()->json([
                    'error' => "Insufficient stock for {$product?->name}. Available: {$product?->stock_qty}",
                ], 422);
            }
        }

        $sale = DB::transaction(function () use ($data) {
            $subtotal = collect($data['items'])->sum(fn ($i) =>
                ($i['quantity'] * $i['unit_price']) - ($i['discount'] ?? 0)
            );
            $taxRate  = (float) ($data['tax_rate'] ?? 0);
            $tax      = round($subtotal * $taxRate / 100, 2);
            $discount = (float) ($data['discount'] ?? 0);
            $total    = round($subtotal + $tax - $discount, 2);

            $amountTendered = $data['amount_tendered'] ?? null;
            $changeGiven    = $data['payment_channel'] === 'cash' && $amountTendered
                ? max(0, round($amountTendered - $total, 2))
                : null;

            $sale = PosSale::create([
                'receipt_number'     => PosSale::generateReceiptNumber(),
                'cashier_id'         => Auth::id(),
                'client_id'          => $data['client_id'] ?? null,
                'walk_in_name'       => $data['walk_in_name'] ?? null,
                'walk_in_phone'      => $data['walk_in_phone'] ?? null,
                'subtotal'           => $subtotal,
                'tax'                => $tax,
                'discount'           => $discount,
                'total'              => $total,
                'currency'           => CompanySetting::current()->default_currency ?? 'KES',
                'payment_channel'    => $data['payment_channel'],
                'mobile_money_code'  => $data['mobile_money_code'] ?? null,
                'amount_tendered'    => $amountTendered,
                'change_given'       => $changeGiven,
                'status'             => 'completed',
            ]);

            foreach ($data['items'] as $item) {
                $product = Product::find($item['product_id']);
                $lineTotal = ($item['quantity'] * $item['unit_price']) - ($item['discount'] ?? 0);

                PosSaleItem::create([
                    'pos_sale_id'  => $sale->id,
                    'product_id'   => $item['product_id'],
                    'product_name' => $product->name,
                    'quantity'     => $item['quantity'],
                    'unit_price'   => $item['unit_price'],
                    'discount'     => $item['discount'] ?? 0,
                    'line_total'   => $lineTotal,
                ]);
            }

            return $sale;
        });

        // Deduct inventory — InventoryService handles its own transaction
        $this->inventory->recordSale(
            collect($data['items'])->map(fn ($i) => [
                'product_id' => $i['product_id'],
                'quantity'   => $i['quantity'],
            ])->toArray(),
            $sale->receipt_number
        );

        return response()->json([
            'success'      => true,
            'sale'         => $sale->load('items'),
            'receipt_url'  => route('web.pos.receipt', $sale),
        ]);
    }

    // ── M-Pesa STK push for POS checkout ────────────────────────────────────

    public function mpesaPush(Request $request)
    {
        $data = $request->validate([
            'phone'  => 'required|string',
            'amount' => 'required|numeric|min:1',
        ]);

        try {
            $result = $this->mobileMoney->posStkPush($data['phone'], (float) $data['amount']);
            return response()->json(['success' => true, ...$result]);
        } catch (\Throwable $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    // ── Receipt ────────────────────────────────────────────────────────────

    public function receipt(PosSale $sale): Response
    {
        $sale->load('items', 'cashier:id,name', 'client:id,name');
        return Inertia::render('pos/receipt', ['sale' => $sale]);
    }

    // ── Sales history ──────────────────────────────────────────────────────

    public function history(Request $request): Response
    {
        $query = PosSale::with('cashier:id,name', 'items')
            ->orderByDesc('created_at');

        if ($request->filled('cashier_id')) $query->where('cashier_id', $request->cashier_id);
        if ($request->filled('from'))       $query->whereDate('created_at', '>=', $request->from);
        if ($request->filled('to'))         $query->whereDate('created_at', '<=', $request->to);

        $sales = $query->paginate(30)->withQueryString();

        $todayTotal = PosSale::whereDate('created_at', today())
            ->where('status', 'completed')
            ->sum('total');

        return Inertia::render('pos/history', [
            'sales'      => $sales,
            'todayTotal' => $todayTotal,
            'filters'    => $request->only(['cashier_id', 'from', 'to']),
        ]);
    }

    // ── Void a sale (reverses stock) ─────────────────────────────────────────

    public function void(Request $request, PosSale $sale)
    {
        if ($sale->status !== 'completed') {
            return back()->with('error', 'Only completed sales can be voided.');
        }

        $data = $request->validate(['reason' => 'required|string|min:5']);

        DB::transaction(function () use ($sale, $data) {
            $sale->update(['status' => 'voided', 'void_reason' => $data['reason']]);

            foreach ($sale->items as $item) {
                $product = $item->product;
                if ($product) {
                    $product->adjustStock(
                        quantity:  $item->quantity,
                        type:      'return_in',
                        reference: "VOID-{$sale->receipt_number}",
                        source:    $sale,
                        notes:     "Stock restored — sale voided: {$data['reason']}",
                    );
                }
            }
        });

        return back()->with('success', 'Sale voided and stock restored.');
    }
}

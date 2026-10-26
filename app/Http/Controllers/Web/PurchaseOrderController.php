<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\PurchaseOrder;
use App\Models\Delivery;
use App\Models\DeliveryDocument;
use App\Models\Supplier;
use App\Models\Product;
use App\Models\Project;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class PurchaseOrderController extends Controller
{
    public function index(Request $request)
    {
        $query = PurchaseOrder::with('supplier:id,name', 'client:id,name,company', 'project:id,name');

        if ($status = $request->get('status'))       $query->where('status', $status);
        if ($supplier = $request->get('supplier_id')) $query->where('supplier_id', $supplier);

        $orders = $query->orderByDesc('order_date')->paginate(20)->withQueryString();

        $suppliers = Supplier::select('id', 'name')->where('active', true)->orderBy('name')->get();

        $counts = PurchaseOrder::selectRaw('status, count(*) as cnt')
            ->groupBy('status')->pluck('cnt', 'status');

        return Inertia::render('purchase-orders/index', compact('orders', 'suppliers', 'counts'));
    }

    public function create()
    {
        $suppliers = Supplier::with('productCatalog:id,supplier_id,name,sku,unit,unit_cost,unit_price')
            ->where('active', true)->orderBy('name')->get();
        $products  = Product::with('supplier:id,name')->where('active', true)->orderBy('name')->get();
        $clients   = User::where('is_client', true)->select('id', 'name', 'company', 'address')->orderBy('name')->get();
        $projects  = Project::select('id', 'name', 'client_id')->orderBy('name')->get();

        return Inertia::render('purchase-orders/create', compact('suppliers', 'products', 'clients', 'projects'));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'supplier_id'            => 'required|exists:suppliers,id',
            'client_id'              => 'nullable|exists:users,id',
            'project_id'             => 'nullable|exists:projects,id',
            'order_date'             => 'required|date',
            'expected_delivery_date' => 'nullable|date',
            'currency'               => 'required|string|size:3',
            'shipping_address'       => 'nullable|string',
            'notes'                  => 'nullable|string',
            'tax_rate'               => 'nullable|numeric|min:0|max:100',
            'lines'                  => 'required|array|min:1',
            'lines.*.product_id'     => 'nullable|exists:products,id',
            'lines.*.description'    => 'required|string',
            'lines.*.quantity'       => 'required|numeric|min:0.01',
            'lines.*.unit_price'     => 'required|numeric|min:0',
        ]);

        $lines    = collect($data['lines'])->map(fn($l) => [
            'product_id'  => $l['product_id'] ?? null,
            'description' => $l['description'],
            'quantity'    => (float) $l['quantity'],
            'unit_price'  => (float) $l['unit_price'],
            'amount'      => round((float) $l['quantity'] * (float) $l['unit_price'], 2),
        ]);
        $subtotal = $lines->sum('amount');
        $tax      = round($subtotal * (float) ($data['tax_rate'] ?? 0) / 100, 2);

        $po = PurchaseOrder::create([
            'supplier_id'            => $data['supplier_id'],
            'client_id'              => $data['client_id'] ?? null,
            'project_id'             => $data['project_id'] ?? null,
            'created_by'             => Auth::id(),
            'order_date'             => $data['order_date'],
            'expected_delivery_date' => $data['expected_delivery_date'] ?? null,
            'currency'               => strtoupper($data['currency']),
            'shipping_address'       => $data['shipping_address'] ?? null,
            'notes'                  => $data['notes'] ?? null,
            'lines'                  => $lines->values()->toArray(),
            'subtotal'               => $subtotal,
            'tax'                    => $tax,
            'total'                  => $subtotal + $tax,
            'status'                 => 'draft',
        ]);

        return redirect()->route('web.purchase-orders.show', $po)
            ->with('success', "Purchase Order {$po->number} created.");
    }

    public function show(PurchaseOrder $purchaseOrder)
    {
        $purchaseOrder->load(
            'supplier:id,name,email,phone,contact_person',
            'client:id,name,company,email,phone',
            'project:id,name',
            'creator:id,name',
            'deliveries.documents',
            'documents.uploader:id,name',
            'documents.approver:id,name'
        );

        return Inertia::render('purchase-orders/show', ['order' => $purchaseOrder]);
    }

    // ── Status transitions ─────────────────────────────────────────────────

    public function send(PurchaseOrder $purchaseOrder)
    {
        $purchaseOrder->update(['status' => 'sent']);
        return back()->with('success', 'PO marked as sent to supplier.');
    }

    public function confirm(PurchaseOrder $purchaseOrder)
    {
        $purchaseOrder->update(['status' => 'confirmed']);
        return back()->with('success', 'PO confirmed by supplier.');
    }

    public function cancel(PurchaseOrder $purchaseOrder)
    {
        $purchaseOrder->update(['status' => 'cancelled']);
        return back()->with('success', 'PO cancelled.');
    }

    // ── Create delivery against this PO ───────────────────────────────────

    public function createDelivery(Request $request, PurchaseOrder $purchaseOrder)
    {
        $data = $request->validate([
            'carrier'         => 'nullable|string|max:255',
            'tracking_number' => 'nullable|string|max:255',
            'tracking_url'    => 'nullable|url|max:500',
            'expected_date'   => 'nullable|date',
            'delivery_notes'  => 'nullable|string',
            'items'           => 'nullable|array',
        ]);

        $count  = $purchaseOrder->deliveries()->count() + 1;
        $delivery = Delivery::create(array_merge($data, [
            'purchase_order_id' => $purchaseOrder->id,
            'client_id'         => $purchaseOrder->client_id,
            'number'            => $purchaseOrder->number . '-D' . str_pad($count, 2, '0', STR_PAD_LEFT),
            'status'            => 'pending',
            'items'             => $data['items'] ?? $purchaseOrder->lines,
        ]));

        return back()->with('success', "Delivery {$delivery->number} created.");
    }

    // ── Upload document against PO ────────────────────────────────────────

    public function uploadDocument(Request $request, PurchaseOrder $purchaseOrder)
    {
        $data = $request->validate([
            'type'  => 'required|in:grn,delivery_note,contract,invoice,other',
            'title' => 'required|string|max:255',
            'notes' => 'nullable|string',
        ]);

        DeliveryDocument::create(array_merge($data, [
            'purchase_order_id' => $purchaseOrder->id,
            'supplier_id'       => $purchaseOrder->supplier_id,
            'uploaded_by'       => Auth::id(),
            'status'            => 'pending',
        ]));

        return back()->with('success', 'Document attached to purchase order.');
    }

    public function destroy(PurchaseOrder $purchaseOrder)
    {
        if ($purchaseOrder->status !== 'draft') {
            return back()->with('error', 'Only draft POs can be deleted.');
        }
        $purchaseOrder->delete();
        return redirect()->route('web.purchase-orders.index')->with('success', 'Purchase order deleted.');
    }
}
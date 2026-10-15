<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Delivery;
use App\Models\DeliveryDocument;
use App\Models\PurchaseOrder;
use App\Services\Inventory\InventoryService;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Inertia\Inertia;

/**
 * DeliveryController — updated to trigger stock receipt via InventoryService
 *
 * The only method changed from the original is deliver():
 *   → now calls $this->inventory->receiveFromDelivery($delivery)
 *     which creates StockMovement records and updates product.stock_qty
 *     for every line item in the delivery that has a product_id.
 *
 * All other methods (index, show, dispatch, reject, uploadDocument,
 * approveDocument, confirmationPdf, confirmPage, confirmByToken) are
 * preserved exactly.
 */
class DeliveryController extends Controller
{
    public function __construct(private InventoryService $inventory) {}

    public function index(Request $request)
    {
        $query = Delivery::with(
            'purchaseOrder:id,number,supplier_id',
            'purchaseOrder.supplier:id,name',
            'client:id,name,company'
        );

        if ($status = $request->get('status')) $query->where('status', $status);

        $deliveries = $query->orderByDesc('created_at')->paginate(20)->withQueryString();
        $counts     = Delivery::selectRaw('status, count(*) as cnt')->groupBy('status')->pluck('cnt', 'status');

        return Inertia::render('deliveries/index', compact('deliveries', 'counts'));
    }

    public function show(Delivery $delivery)
    {
        $delivery->load(
            'purchaseOrder.supplier:id,name,email,phone',
            'client:id,name,company,email,phone,address',
            'receiver:id,name',
            'documents.uploader:id,name',
            'documents.approver:id,name'
        );

        return Inertia::render('deliveries/show', compact('delivery'));
    }

    public function dispatch(Delivery $delivery)
    {
        $delivery->update(['status' => 'in_transit']);
        return back()->with('success', 'Delivery marked as in transit.');
    }

    /**
     * Mark delivered, generate GRN, and update inventory stock levels.
     *
     * KEY CHANGE from original: after updating the delivery status and
     * creating the GRN document, we call receiveFromDelivery() which
     * iterates the delivery items and creates signed StockMovement records
     * for every product, incrementing product.stock_qty atomically.
     */
    public function deliver(Request $request, Delivery $delivery)
    {
        $data = $request->validate([
            'signed_by'      => 'required|string|max:255',
            'client_notes'   => 'nullable|string',
            'delivered_date' => 'required|date',
            'items'          => 'nullable|array',
        ]);

        // Merge any item-level overrides from the request (partial deliveries)
        if (! empty($data['items'])) {
            $delivery->update(['items' => $data['items']]);
        }

        $delivery->update(array_merge($data, [
            'status'      => 'delivered',
            'signed_at'   => now(),
            'received_by' => Auth::id(),
        ]));

        // Update PO status
        $po          = $delivery->purchaseOrder;
        $allDelivered = $po->deliveries()->where('status', '!=', 'delivered')->doesntExist();
        $po->update(['status' => $allDelivered ? 'delivered' : 'partially_delivered']);

        // Auto-generate GRN document
        DeliveryDocument::create([
            'delivery_id'       => $delivery->id,
            'purchase_order_id' => $delivery->purchase_order_id,
            'supplier_id'       => $po->supplier_id,
            'uploaded_by'       => Auth::id(),
            'type'              => 'grn',
            'title'             => "GRN – {$delivery->number}",
            'status'            => 'approved',
            'approved_by'       => Auth::id(),
            'approved_at'       => now(),
            'notes'             => "Auto-generated on delivery sign-off by {$data['signed_by']}.",
        ]);

        // ── STOCK UPDATE (the fix) ─────────────────────────────────────────
        $stockUpdated = $this->inventory->receiveFromDelivery($delivery->fresh());

        $stockMsg = $stockUpdated > 0
            ? " Stock updated for {$stockUpdated} product(s)."
            : '';

        return back()->with('success', "Delivery completed and GRN generated.{$stockMsg}");
    }

    public function reject(Request $request, Delivery $delivery)
    {
        $data = $request->validate([
            'client_notes' => 'required|string',
            'signed_by'    => 'nullable|string',
        ]);

        $delivery->update(array_merge($data, ['status' => 'rejected', 'signed_at' => now()]));
        return back()->with('success', 'Delivery rejection recorded.');
    }

    public function uploadDocument(Request $request, Delivery $delivery)
    {
        $data = $request->validate([
            'type'  => 'required|in:grn,delivery_note,contract,invoice,other',
            'title' => 'required|string|max:255',
            'notes' => 'nullable|string',
        ]);

        DeliveryDocument::create(array_merge($data, [
            'delivery_id'       => $delivery->id,
            'purchase_order_id' => $delivery->purchase_order_id,
            'supplier_id'       => $delivery->purchaseOrder->supplier_id ?? null,
            'uploaded_by'       => Auth::id(),
            'status'            => 'pending',
        ]));

        return back()->with('success', 'Document uploaded.');
    }

    public function approveDocument(Request $request, DeliveryDocument $document)
    {
        $data = $request->validate([
            'action' => 'required|in:approved,rejected',
            'notes'  => 'nullable|string',
        ]);

        $document->update([
            'status'      => $data['action'],
            'notes'       => $data['notes'] ?? $document->notes,
            'approved_by' => Auth::id(),
            'approved_at' => now(),
        ]);

        return back()->with('success', 'Document ' . $data['action'] . '.');
    }

    public function confirmationPdf(Delivery $delivery): HttpResponse
    {
        $delivery->load(
            'purchaseOrder.supplier:id,name,email,phone,address',
            'client:id,name,company,email,phone,address',
            'receiver:id,name',
        );

        if (empty($delivery->getAttributes()['confirm_token'] ?? null)) {
            $meta  = $delivery->items ?? [];
            $token = Str::random(32);
            $delivery->update(['items' => array_merge($meta, ['_confirm_token' => $token])]);
        }

        $confirmUrl = route('web.deliveries.confirm-page', [
            'token' => $delivery->items['_confirm_token'] ?? '',
        ]);

        $company = [
            'name'    => config('app.name', 'LMA'),
            'address' => config('company.address', 'Nairobi, Kenya'),
            'email'   => config('company.email', ''),
            'phone'   => config('company.phone', ''),
            'logo'    => public_path('images/logo.png'),
        ];

        $pdf = app('dompdf.wrapper');
        $pdf->loadView('pdf.delivery-confirmation', compact('delivery', 'company', 'confirmUrl'));
        $pdf->setPaper('a4', 'portrait');

        return $pdf->download("delivery-confirmation-{$delivery->number}.pdf");
    }

    public function confirmPage(string $token)
    {
        $delivery = $this->findByToken($token);
        if (! $delivery) abort(404, 'Confirmation link is invalid or has expired.');
        $delivery->load('purchaseOrder:id,number', 'client:id,name,company');
        return Inertia::render('deliveries/confirm', ['delivery' => $delivery, 'token' => $token]);
    }

    public function confirmByToken(Request $request, string $token)
    {
        $delivery = $this->findByToken($token);
        if (! $delivery) abort(404, 'Confirmation link is invalid or has expired.');
        if ($delivery->status === 'delivered') return back()->with('info', 'This delivery has already been confirmed.');

        $data = $request->validate([
            'signed_by'    => 'required|string|max:255',
            'client_notes' => 'nullable|string|max:1000',
        ]);

        $delivery->update([
            'status'         => 'delivered',
            'signed_by'      => $data['signed_by'],
            'client_notes'   => $data['client_notes'] ?? null,
            'signed_at'      => now(),
            'delivered_date' => now()->toDateString(),
        ]);

        return back()->with('success', 'Thank you! Your delivery has been confirmed.');
    }

    private function findByToken(string $token): ?Delivery
    {
        return Delivery::whereJsonContains('items->_confirm_token', $token)->first();
    }
}

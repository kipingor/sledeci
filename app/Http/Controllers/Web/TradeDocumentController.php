<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use Sledeci\Accounting\Models\Invoice;
use App\Models\TradeDocument;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

/**
 * TradeDocumentController
 *
 * Generates cross-border trade documentation for exporters:
 *  - EAC / COMESA Certificate of Origin
 *  - Customs declaration (export/import)
 *  - Pro-forma invoice for customs valuation
 *  - Packing list
 */
class TradeDocumentController extends Controller
{
    public function index(Request $request): Response
    {
        $query = TradeDocument::with('invoice:id,number', 'creator:id,name')
            ->orderByDesc('created_at');

        if ($type = $request->get('type'))     $query->where('type', $type);
        if ($status = $request->get('status')) $query->where('status', $status);

        $documents = $query->paginate(20)->withQueryString();

        return Inertia::render('trade-documents/index', [
            'documents' => $documents,
            'filters'   => $request->only(['type', 'status']),
        ]);
    }

    public function create(Request $request): Response
    {
        $invoice = null;
        if ($request->filled('invoice_id')) {
            $invoice = Invoice::with('client:id,name,address,phone')
                ->find($request->invoice_id);
        }

        return Inertia::render('trade-documents/create', [
            'invoice'         => $invoice,
            'eacCountries'    => TradeDocument::EAC_COUNTRIES,
            'comesaCountries' => TradeDocument::COMESA_COUNTRIES,
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'invoice_id'           => 'nullable|exists:invoices,id',
            'purchase_order_id'    => 'nullable|exists:purchase_orders,id',
            'type'                 => 'required|in:certificate_of_origin,customs_declaration,proforma_invoice,packing_list',
            'trade_direction'      => 'required|in:export,import',
            'origin_country'       => 'required|string|size:2',
            'destination_country'  => 'required|string|size:2',
            'exporter_name'        => 'required|string|max:255',
            'exporter_address'     => 'required|string',
            'exporter_kra_pin'     => 'nullable|string|max:20',
            'importer_name'        => 'required|string|max:255',
            'importer_address'     => 'required|string',
            'importer_tax_id'      => 'nullable|string|max:50',
            'transport_mode'       => 'nullable|in:road,air,sea,rail',
            'vehicle_reg'          => 'nullable|string|max:50',
            'border_post'          => 'nullable|string|max:100',
            'departure_date'       => 'nullable|date',
            'items'                => 'required|array|min:1',
            'items.*.description'  => 'required|string',
            'items.*.hs_code'      => 'nullable|string|max:20',
            'items.*.quantity'     => 'required|numeric|min:0',
            'items.*.unit'         => 'nullable|string|max:20',
            'items.*.gross_weight' => 'nullable|numeric|min:0',
            'items.*.net_weight'   => 'nullable|numeric|min:0',
            'items.*.value'        => 'required|numeric|min:0',
            'currency'             => 'required|string|size:3',
            'notes'                => 'nullable|string',
        ]);

        $items       = collect($data['items']);
        $totalValue  = $items->sum('value');
        $grossWeight = $items->sum('gross_weight');
        $netWeight   = $items->sum('net_weight');

        $document = TradeDocument::create([
            ...$data,
            'document_number'    => TradeDocument::generateDocumentNumber($data['type']),
            'created_by'         => Auth::id(),
            'total_value'        => $totalValue,
            'total_gross_weight' => $grossWeight,
            'total_net_weight'   => $netWeight,
            'status'             => 'draft',
        ]);

        $document->update(['origin_region' => $document->suggestedRegion()]);

        return redirect()->route('web.trade-documents.show', $document)
            ->with('success', ucwords(str_replace('_', ' ', $data['type'])) . ' created.');
    }

    public function show(TradeDocument $tradeDocument): Response
    {
        $tradeDocument->load('invoice:id,number,total,currency', 'creator:id,name');

        return Inertia::render('trade-documents/show', [
            'document' => $tradeDocument,
        ]);
    }

    public function update(Request $request, TradeDocument $tradeDocument)
    {
        if ($tradeDocument->status === 'certified') {
            return back()->with('error', 'Certified documents cannot be edited. Create a new version instead.');
        }

        $data = $request->validate([
            'transport_mode' => 'nullable|in:road,air,sea,rail',
            'vehicle_reg'    => 'nullable|string|max:50',
            'border_post'    => 'nullable|string|max:100',
            'departure_date' => 'nullable|date',
            'notes'          => 'nullable|string',
        ]);

        $tradeDocument->update($data);
        return back()->with('success', 'Document updated.');
    }

    public function submitForCertification(Request $request, TradeDocument $tradeDocument)
    {
        $tradeDocument->update(['status' => 'pending_certification']);
        return back()->with('success', 'Marked as submitted for certification.');
    }

    public function recordCertification(Request $request, TradeDocument $tradeDocument)
    {
        $data = $request->validate([
            'certifying_authority'  => 'required|string|max:255',
            'certificate_reference' => 'required|string|max:100',
            'certified_date'        => 'required|date',
            'valid_until'           => 'nullable|date|after:certified_date',
        ]);

        $tradeDocument->update([...$data, 'status' => 'certified']);
        return back()->with('success', 'Certification recorded.');
    }

    public function destroy(TradeDocument $tradeDocument)
    {
        if ($tradeDocument->status === 'certified') {
            return back()->with('error', 'Certified documents cannot be deleted.');
        }
        $tradeDocument->delete();
        return redirect()->route('web.trade-documents.index')->with('success', 'Document deleted.');
    }

    public function downloadPdf(TradeDocument $tradeDocument): HttpResponse
    {
        $tradeDocument->load('invoice:id,number', 'creator:id,name');

        $view = match ($tradeDocument->type) {
            'certificate_of_origin' => 'pdf.trade.certificate-of-origin',
            'customs_declaration'   => 'pdf.trade.customs-declaration',
            'proforma_invoice'      => 'pdf.trade.proforma-invoice',
            'packing_list'          => 'pdf.trade.packing-list',
        };

        $pdf = app('dompdf.wrapper');
        $pdf->loadView($view, [
            'document' => $tradeDocument,
            'company'  => config('company'),
        ]);
        $pdf->setPaper('a4', 'portrait');

        return $pdf->download("{$tradeDocument->document_number}.pdf");
    }
}

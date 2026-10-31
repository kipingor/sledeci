<?php

namespace Sledeci\KenyaTax\Http\Controllers;

use Sledeci\Core\Http\Controller;
use Sledeci\Accounting\Models\Invoice;
use Sledeci\KenyaTax\Services\EtimsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class EtimsController extends Controller
{
    public function __construct(private EtimsService $etims) {}

    /**
     * Submit a single invoice to eTIMS.
     */
    public function submitInvoice(Request $request, Invoice $invoice)
    {
        $this->authorize('submitToEtims', $invoice);

        if (! config('kenya-tax.company_setting_model')::current()->etims_enabled) {
            return response()->json(['error' => 'eTIMS is not enabled.'], 422);
        }

        if (in_array($invoice->etims_status, ['submitted', 'accepted'])) {
            return response()->json(['error' => 'Invoice already submitted to eTIMS.'], 422);
        }

        // Optional: attach buyer KRA PIN if provided
        if ($pin = $request->input('buyer_kra_pin')) {
            $invoice->update([
                'buyer_kra_pin' => strtoupper($pin),
                'buyer_name'    => $request->input('buyer_name'),
            ]);
        }

        try {
            $result = $this->etims->submitInvoice($invoice);
            return response()->json([
                'success'              => true,
                'message'              => 'Invoice submitted to eTIMS successfully.',
                'etims_invoice_number' => $result['etims_invoice_number'],
                'cu_invoice_number'    => $result['cu_invoice_number'],
                'qr_url'               => $result['qr_url'],
            ]);
        } catch (\Throwable $e) {
            Log::error('eTIMS submission failed', ['invoice' => $invoice->id, 'error' => $e->getMessage()]);
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    /**
     * Submit multiple invoices in bulk.
     */
    public function bulkSubmit(Request $request)
    {
        $request->validate(['invoice_ids' => 'required|array', 'invoice_ids.*' => 'integer|exists:invoices,id']);

        $results    = [];
        $invoices   = Invoice::whereIn('id', $request->input('invoice_ids'))
            ->whereNotIn('etims_status', ['submitted', 'accepted'])
            ->get();

        foreach ($invoices as $invoice) {
            try {
                $result = $this->etims->submitInvoice($invoice);
                $results[] = ['invoice_id' => $invoice->id, 'success' => true, ...$result];
            } catch (\Throwable $e) {
                $results[] = ['invoice_id' => $invoice->id, 'success' => false, 'error' => $e->getMessage()];
            }
        }

        $successCount = collect($results)->where('success', true)->count();
        return response()->json([
            'submitted' => $successCount,
            'failed'    => count($results) - $successCount,
            'results'   => $results,
        ]);
    }

    /**
     * Get eTIMS status for an invoice.
     */
    public function invoiceStatus(Invoice $invoice)
    {
        return response()->json([
            'etims_status'          => $invoice->etims_status,
            'etims_invoice_number'  => $invoice->etims_invoice_number,
            'etims_cu_invoice_number' => $invoice->etims_cu_invoice_number,
            'etims_submitted_at'    => $invoice->etims_submitted_at,
            'etims_qr_url'          => $invoice->etims_qr_url,
        ]);
    }

    /**
     * Fetch standard codes from eTIMS (for item classification dropdowns).
     */
    public function standardCodes()
    {
        try {
            $codes = $this->etims->fetchStandardCodes();
            return response()->json($codes);
        } catch (\Throwable $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    /**
     * Test eTIMS connectivity.
     */
    public function testConnection()
    {
        try {
            $result = $this->etims->testConnection();
            return response()->json($result);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }
}
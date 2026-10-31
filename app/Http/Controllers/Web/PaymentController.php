<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use Sledeci\Accounting\Models\Invoice;
use Sledeci\Accounting\Models\Payment;
use App\Services\Forex\ForexService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class PaymentController extends Controller
{
    public function __construct(private ForexService $forex) {}

    // ── Index ──────────────────────────────────────────────────────────────

    public function index(Request $request): Response
    {
        $query = Payment::with('invoice:id,number,currency', 'invoice.client:id,name');

        if ($search = $request->get('search')) {
            $query->where(fn ($q) => $q
                ->where('mobile_money_code', 'like', "%{$search}%")
                ->orWhere('mobile_money_phone', 'like', "%{$search}%")
                ->orWhere('reference', 'like', "%{$search}%")
                ->orWhereHas('invoice', fn ($iq) => $iq->where('number', 'like', "%{$search}%"))
            );
        }

        if ($channel = $request->get('channel')) {
            $query->where('channel', $channel);
        }

        if ($recon = $request->get('reconciliation_status')) {
            $query->where('reconciliation_status', $recon);
        }

        $payments = $query->latest('paid_at')->paginate(20)->withQueryString();

        // Flatten client relation for the frontend
        $payments->getCollection()->transform(function (Payment $p) {
            $p->client = $p->invoice?->client;

            return $p;
        });

        // ── Totals ──────────────────────────────────────────────────────────
        $byChannel = Payment::selectRaw('channel, SUM(amount) as total')
            ->whereNotNull('channel')
            ->groupBy('channel')
            ->pluck('total', 'channel');

        $unmatched = Payment::whereIn('channel', ['mpesa', 'airtel_money', 'mtn_momo'])
            ->where('reconciliation_status', 'unmatched');

        $totals = [
            'month' => (float) Payment::whereMonth('paid_at', now()->month)
                ->whereYear('paid_at', now()->year)
                ->sum('amount'),
            'year' => (float) Payment::whereYear('paid_at', now()->year)->sum('amount'),
            'unmatched_count' => $unmatched->count(),
            'unmatched_amount' => (float) $unmatched->sum('amount'),
            'by_channel' => $byChannel->map(fn ($v) => (float) $v)->toArray(),
        ];

        return Inertia::render('payments/index', [
            'payments' => $payments,
            'totals' => $totals,
            'filters' => $request->only(['search', 'channel', 'reconciliation_status']),
        ]);
    }

    // ── Show ───────────────────────────────────────────────────────────────

    public function show(Payment $payment): Response
    {
        $payment->load('invoice:id,number,currency', 'invoice.client:id,name', 'receivedBy:id,name', 'messageLogs');

        // Suggest unmatched invoices if this payment isn't linked
        $unmatchedInvoices = [];
        if (! $payment->invoice_id) {
            $unmatchedInvoices = Invoice::whereIn('status', ['issued', 'overdue'])
                ->where('currency', $payment->currency)
                ->select('id', 'number', 'total', 'currency')
                ->orderByDesc('issue_date')
                ->limit(20)
                ->get();
        }

        return Inertia::render('payments/show', [
            'payment' => $payment,
            'functional_currency' => config('company.functional_currency', 'KES'),
            'unmatched_invoices' => $unmatchedInvoices,
        ]);
    }

    // ── Reconciliation actions ────────────────────────────────────────────

    /**
     * Manually update the reconciliation status of a payment.
     * Used when a mobile money payment couldn't be auto-matched.
     */
    public function updateReconciliation(Request $request, Payment $payment)
    {
        $data = $request->validate([
            'reconciliation_status' => 'required|in:pending,matched,unmatched,exception',
        ]);

        $payment->update(['reconciliation_status' => $data['reconciliation_status']]);

        return back()->with('success', 'Reconciliation status updated.');
    }

    /**
     * Link an unmatched mobile money payment to an invoice.
     * Common scenario: customer paid via M-Pesa but used the wrong
     * account reference, so the webhook couldn't auto-match.
     */
    public function linkToInvoice(Request $request, Payment $payment)
    {
        $data = $request->validate([
            'invoice_id' => 'required|exists:invoices,id',
        ]);

        $invoice = Invoice::findOrFail($data['invoice_id']);

        DB::transaction(function () use ($payment, $invoice) {
            $payment->update([
                'invoice_id' => $invoice->id,
                'project_id' => $invoice->project_id,
                'reconciliation_status' => 'matched',
            ]);

            // Record forex gain/loss now that we know which invoice this belongs to
            $functional = config('company.functional_currency', 'KES');
            if ($invoice->currency !== $functional) {
                $this->forex->recordPaymentForex($payment, $functional);
            }

            // Mark invoice as paid if fully settled
            if ($invoice->fresh()->amountDue() <= 0) {
                $invoice->update(['status' => 'paid']);
            }
        });

        return back()->with('success', "Payment linked to invoice {$invoice->number}.");
    }
}

<?php

namespace Sledeci\Accounting\Http\Controllers;

use App\Models\CompanySetting;
use App\Models\Project;
use App\Models\User;
use App\Services\MessagingService;
use App\Services\MobileMoney\MobileMoneyService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;
use Sledeci\Accounting\Jobs\SendPaymentReceiptJob;
use Sledeci\Accounting\Mail\InvoiceMail;
use Sledeci\Accounting\Models\Invoice;
use Sledeci\Accounting\Models\Payment;
use Sledeci\Accounting\Services\Forex\ForexService;
use Sledeci\Core\Http\Controller;

class InvoiceController extends Controller
{
    public function __construct(
        private ForexService $forex,
        private MobileMoneyService $mobileMoney,
        private MessagingService $messaging,
    ) {}

    // ── Index ──────────────────────────────────────────────────────────────

    public function index(Request $request)
    {
        $query = Invoice::with('client:id,name,email', 'project:id,name')
            ->withCount('payments');

        if ($status = $request->get('status')) {
            $query->where('status', $status);
        }
        if ($client = $request->get('client_id')) {
            $query->where('client_id', $client);
        }
        if ($from = $request->get('from')) {
            $query->whereDate('issue_date', '>=', $from);
        }
        if ($to = $request->get('to')) {
            $query->whereDate('issue_date', '<=', $to);
        }
        if ($cur = $request->get('currency')) {
            $query->where('currency', strtoupper($cur));
        }

        $invoices = $query->orderByDesc('issue_date')->paginate(20)->withQueryString();

        // Auto-mark overdue
        Invoice::where('status', 'issued')
            ->whereDate('due_date', '<', now())
            ->update(['status' => 'overdue']);

        // Multi-currency summary in functional currency
        $functionalCurrency = config('company.functional_currency', 'KES');
        $multiCurrencySummary = $this->forex->buildMultiCurrencySummary($functionalCurrency);

        $summary = [
            'total_billed' => Invoice::whereNotIn('status', ['draft', 'cancelled'])->sum('total'),
            'total_paid' => Payment::sum('amount'),
            'total_overdue' => Invoice::where('status', 'overdue')->sum('total'),
            'draft_count' => Invoice::where('status', 'draft')->count(),
            'total_functional' => $multiCurrencySummary['total'],
            'functional_currency' => $functionalCurrency,
            'by_currency' => $multiCurrencySummary['by_currency'],
        ];

        $clients = User::select('id', 'name', 'email')
            ->whereHas('invoices')
            ->orderBy('name')
            ->get();

        return Inertia::render('invoices/index', compact('invoices', 'summary', 'clients'));
    }

    // ── Create ─────────────────────────────────────────────────────────────

    public function create()
    {
        $clients = User::select('id', 'name', 'email', 'phone')->orderBy('name')->get();
        $projects = Project::select('id', 'name', 'client_id')->orderBy('name')->get();

        // Pass live forex rates to frontend for the currency converter widget
        $currencies = array_keys(ForexService::AFRICAN_CURRENCIES);
        $rates = [];
        foreach ($currencies as $cur) {
            if ($cur !== 'KES') {
                try {
                    $rates[$cur] = $this->forex->rate($cur, 'KES');
                } catch (\Throwable) {
                    $rates[$cur] = null;
                }
            }
        }

        return Inertia::render('invoices/create', [
            'clients' => $clients,
            'projects' => $projects,
            'currencies' => ForexService::AFRICAN_CURRENCIES,
            'forex_rates' => $rates,
        ]);
    }

    // ── Store ──────────────────────────────────────────────────────────────

    public function store(Request $request)
    {
        $data = $request->validate([
            'client_id' => 'required|exists:users,id',
            'project_id' => 'nullable|exists:projects,id',
            'issue_date' => 'required|date',
            'due_date' => 'required|date|after_or_equal:issue_date',
            'currency' => 'required|string|size:3',
            'notes' => 'nullable|string',
            'tax_rate' => 'nullable|numeric|min:0|max:100',
            'buyer_kra_pin' => 'nullable|string|max:20',
            'buyer_name' => 'nullable|string|max:255',
            'lines' => 'required|array|min:1',
            'lines.*.description' => 'required|string',
            'lines.*.quantity' => 'required|numeric|min:0',
            'lines.*.unit_price' => 'required|numeric|min:0',
        ]);

        $lines = collect($data['lines'])->map(fn ($l) => [
            'description' => $l['description'],
            'quantity' => (float) $l['quantity'],
            'unit_price' => (float) $l['unit_price'],
            'amount' => round((float) $l['quantity'] * (float) $l['unit_price'], 2),
        ]);
        $subtotal = $lines->sum('amount');
        $taxRate = (float) ($data['tax_rate'] ?? config('company.default_vat_rate', 0));
        $tax = round($subtotal * $taxRate / 100, 2);
        $total = $subtotal + $tax;

        $invoice = Invoice::create([
            'client_id' => $data['client_id'],
            'project_id' => $data['project_id'] ?? null,
            'issue_date' => $data['issue_date'],
            'due_date' => $data['due_date'],
            'currency' => strtoupper($data['currency']),
            'notes' => $data['notes'] ?? null,
            'buyer_kra_pin' => $data['buyer_kra_pin'] ?? null,
            'buyer_name' => $data['buyer_name'] ?? null,
            'status' => 'draft',
            'lines' => $lines->values()->toArray(),
            'subtotal' => $subtotal,
            'tax' => $tax,
            'total' => $total,
        ]);

        // Stamp with current forex rate in background
        $functionalCurrency = config('company.functional_currency', 'KES');
        if ($invoice->currency !== $functionalCurrency) {
            $this->forex->stampInvoice($invoice, $functionalCurrency);
        }

        return redirect()->route('web.invoices.show', $invoice)
            ->with('success', "Invoice {$invoice->number} created.");
    }

    // ── Show ───────────────────────────────────────────────────────────────

    public function show(Invoice $invoice)
    {
        $invoice->load('client:id,name,email,phone', 'project:id,name', 'payments');

        return Inertia::render('invoices/show', [
            'invoice' => $invoice,
            'amount_paid' => $invoice->amountPaid(),
            'amount_due' => $invoice->amountDue(),
            'etims_enabled' => CompanySetting::current()->etims_enabled ?? false,
        ]);
    }

    // ── Edit / Update ──────────────────────────────────────────────────────

    public function edit(Invoice $invoice)
    {
        $invoice->load('client:id,name,email', 'project:id,name');
        $clients = User::select('id', 'name', 'email', 'phone')->orderBy('name')->get();
        $projects = Project::select('id', 'name', 'client_id')->orderBy('name')->get();

        return Inertia::render('invoices/edit', [
            'invoice' => $invoice,
            'clients' => $clients,
            'projects' => $projects,
            'currencies' => ForexService::AFRICAN_CURRENCIES,
        ]);
    }

    public function update(Request $request, Invoice $invoice)
    {
        if (in_array($invoice->status, ['paid', 'cancelled'])) {
            return back()->with('error', 'Cannot edit a paid or cancelled invoice.');
        }

        $data = $request->validate([
            'client_id' => 'required|exists:users,id',
            'project_id' => 'nullable|exists:projects,id',
            'issue_date' => 'required|date',
            'due_date' => 'required|date|after_or_equal:issue_date',
            'currency' => 'required|string|size:3',
            'notes' => 'nullable|string',
            'tax_rate' => 'nullable|numeric|min:0|max:100',
            'buyer_kra_pin' => 'nullable|string|max:20',
            'lines' => 'required|array|min:1',
            'lines.*.description' => 'required|string',
            'lines.*.quantity' => 'required|numeric|min:0',
            'lines.*.unit_price' => 'required|numeric|min:0',
        ]);

        $lines = collect($data['lines'])->map(fn ($l) => [
            'description' => $l['description'],
            'quantity' => (float) $l['quantity'],
            'unit_price' => (float) $l['unit_price'],
            'amount' => round((float) $l['quantity'] * (float) $l['unit_price'], 2),
        ]);
        $subtotal = $lines->sum('amount');
        $tax = round($subtotal * (float) ($data['tax_rate'] ?? 0) / 100, 2);

        $invoice->update([
            'client_id' => $data['client_id'],
            'project_id' => $data['project_id'] ?? null,
            'issue_date' => $data['issue_date'],
            'due_date' => $data['due_date'],
            'currency' => strtoupper($data['currency']),
            'notes' => $data['notes'] ?? null,
            'buyer_kra_pin' => $data['buyer_kra_pin'] ?? null,
            'lines' => $lines->values()->toArray(),
            'subtotal' => $subtotal,
            'tax' => $tax,
            'total' => $subtotal + $tax,
        ]);

        // Re-stamp forex rate if currency changed
        $functional = config('company.functional_currency', 'KES');
        if ($invoice->currency !== $functional) {
            $this->forex->stampInvoice($invoice, $functional);
        }

        return redirect()->route('web.invoices.show', $invoice)->with('success', 'Invoice updated.');
    }

    // ── Send — email PDF + optional WhatsApp ──────────────────────────────

    public function send(Request $request, Invoice $invoice)
    {
        if (! in_array($invoice->status, ['draft', 'issued', 'overdue'])) {
            return back()->with('error', 'Only draft, issued, or overdue invoices can be sent.');
        }

        $invoice->load('client:id,name,email,phone', 'project:id,name');

        $data = $request->validate([
            'message' => 'nullable|string|max:2000',
            'send_whatsapp' => 'boolean',
            'send_sms' => 'boolean',
            'whatsapp_phone' => 'nullable|string',
        ]);

        $sent = [];

        // Email (existing behaviour)
        if ($invoice->client?->email) {
            Mail::to($invoice->client->email, $invoice->client->name)
                ->send(new InvoiceMail($invoice, $data['message'] ?? ''));
            $sent[] = 'email';
        }

        // WhatsApp / SMS
        $phone = $data['whatsapp_phone'] ?? $invoice->client?->phone;
        if ($phone && ($data['send_whatsapp'] || $data['send_sms'])) {
            $this->messaging->sendInvoice($invoice, $phone);
            $sent[] = 'whatsapp/sms';
        }

        $invoice->update(['status' => 'issued', 'sent_at' => now()]);

        $channels = implode(' & ', $sent) ?: 'no channel';

        return back()->with('success', "Invoice {$invoice->number} sent via {$channels}.");
    }

    // ── WhatsApp send only ─────────────────────────────────────────────────

    public function sendWhatsApp(Request $request, Invoice $invoice)
    {
        $data = $request->validate(['phone' => 'required|string']);
        $log = $this->messaging->sendInvoice($invoice, $data['phone']);

        return response()->json(['success' => $log->status === 'sent', 'channel' => $log->channel]);
    }

    // ── Send reminder ──────────────────────────────────────────────────────

    public function sendReminder(Invoice $invoice)
    {
        if ($invoice->status !== 'overdue') {
            return response()->json(['error' => 'Only overdue invoices can be reminded.'], 422);
        }
        $log = $this->messaging->sendPaymentReminder($invoice);

        return response()->json(['success' => $log->status === 'sent']);
    }

    // ── Record Payment (supports mobile money channels) ────────────────────

    public function recordPayment(Request $request, Invoice $invoice)
    {
        $data = $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'channel' => 'required|string|in:cash,bank,mpesa,airtel_money,mtn_momo,card,cheque,crypto,other',
            'reference' => 'nullable|string|max:255',
            'mobile_money_code' => 'nullable|string|max:50|unique:payments,mobile_money_code',
            'mobile_money_phone' => 'nullable|string|max:20',
            'notes' => 'nullable|string',
            'paid_at' => 'required|date',
        ]);

        $payment = DB::transaction(function () use ($invoice, $data) {
            $payment = Payment::create([
                'invoice_id' => $invoice->id,
                'project_id' => $invoice->project_id,
                'amount' => $data['amount'],
                'currency' => $invoice->currency,
                'method' => $data['channel'],
                'channel' => $data['channel'],
                'reference' => $data['reference'] ?? ($data['mobile_money_code'] ?? null),
                'mobile_money_code' => $data['mobile_money_code'] ?? null,
                'mobile_money_phone' => $data['mobile_money_phone'] ?? null,
                'reconciliation_status' => ! empty($data['mobile_money_code']) ? 'matched' : 'pending',
                'notes' => $data['notes'] ?? null,
                'paid_at' => $data['paid_at'],
                'received_by' => Auth::id(),
            ]);

            // Record forex gain/loss
            $functional = config('company.functional_currency', 'KES');
            if ($invoice->currency !== $functional) {
                $this->forex->recordPaymentForex($payment, $functional);
            }

            if ($invoice->fresh()->amountDue() <= 0) {
                $invoice->update(['status' => 'paid']);
            }

            return $payment;
        });

        // Send the receipt only after the payment is committed, and off the request:
        // a slow/failing SMS provider must not hold DB locks or roll the payment back.
        SendPaymentReceiptJob::dispatch($payment)->afterCommit();

        return back()->with('success', 'Payment recorded; receipt queued.');
    }

    // ── M-Pesa STK Push ────────────────────────────────────────────────────

    public function initiateMpesaPush(Request $request, Invoice $invoice)
    {
        $data = $request->validate([
            'phone' => 'required|string',
            'amount' => 'nullable|numeric|min:1',
        ]);

        try {
            $result = $this->mobileMoney->mpesaStkPush(
                $invoice,
                $data['phone'],
                $data['amount'] ?? null
            );

            return response()->json(['success' => true, ...$result]);
        } catch (\Throwable $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    // ── Forex rates endpoint (for JS currency converter) ───────────────────

    public function forexRates(Request $request)
    {
        $base = strtoupper($request->get('base', 'KES'));
        $rates = $this->forex->refreshRates($base);

        return response()->json(['base' => $base, 'rates' => $rates, 'timestamp' => now()->toIso8601String()]);
    }

    // ── Download PDF ──────────────────────────────────────────────────────

    public function downloadPdf(Invoice $invoice): HttpResponse
    {
        $invoice->load('client:id,name,email,company,address,phone', 'project:id,name', 'payments');
        $pdf = Pdf::loadView('pdf.invoice', [
            'invoice' => $invoice,
            'company' => config('company'),
        ])->setPaper('a4', 'portrait');

        return $pdf->download("{$invoice->number}.pdf");
    }

    // ── Cancel / Destroy ──────────────────────────────────────────────────

    public function cancel(Invoice $invoice)
    {
        if ($invoice->status === 'paid') {
            return back()->with('error', 'Cannot cancel a paid invoice.');
        }
        $invoice->update(['status' => 'cancelled']);

        return back()->with('success', 'Invoice cancelled.');
    }

    public function destroy(Invoice $invoice)
    {
        if ($invoice->status !== 'draft') {
            return back()->with('error', 'Only draft invoices can be deleted.');
        }
        $invoice->delete();

        return redirect()->route('web.invoices.index')->with('success', 'Invoice deleted.');
    }
}

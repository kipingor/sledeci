<?php

namespace Sledeci\Accounting\Http\Controllers;

use Sledeci\Core\Http\Controller;
use Sledeci\Accounting\Models\AccountingPeriod;
use Sledeci\Accounting\Models\ChartOfAccount;
use Sledeci\Accounting\Models\Invoice;
use Sledeci\Accounting\Models\JournalEntry;
use Sledeci\Accounting\Models\JournalEntryLine;
use Sledeci\Accounting\Models\Payment;
use Sledeci\Accounting\Models\Expense;
use Sledeci\Accounting\Services\PostingEngine;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class JournalEntryController extends Controller
{
    public function __construct(protected PostingEngine $engine) {}

    public function index(Request $request): Response
    {
        $query = JournalEntry::with(['period', 'createdBy'])
            ->when($request->type,   fn ($q) => $q->where('type', $request->type))
            ->when($request->status, fn ($q) => $q->where('status', $request->status))
            ->when($request->from,   fn ($q) => $q->whereDate('entry_date', '>=', $request->from))
            ->when($request->to,     fn ($q) => $q->whereDate('entry_date', '<=', $request->to))
            ->latest('entry_date');

        $entries = $query->paginate(30)->withQueryString();

        return Inertia::render('accounting/journal-entries', [
            'entries'  => $entries,
            'filters'  => $request->only(['type', 'status', 'from', 'to']),
            'periods'  => AccountingPeriod::where('status', '!=', 'locked')->orderByDesc('starts_on')->get(['id', 'name', 'status']),
        ]);
    }

    public function show(JournalEntry $journalEntry): Response
    {
        $journalEntry->load(['lines.account', 'lines.project', 'period', 'createdBy', 'postedBy']);

        return Inertia::render('accounting/journal-entry-show', [
            'entry' => $journalEntry,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('accounting/journal-entry-create', [
            'accounts' => ChartOfAccount::where('is_active', true)
                ->orderBy('code')
                ->get(['id', 'code', 'name', 'type', 'normal_balance']),
            'periods'  => AccountingPeriod::where('status', 'open')
                ->orderByDesc('starts_on')
                ->get(['id', 'name', 'starts_on', 'ends_on']),
            'projects' => \App\Models\Project::select('id', 'name')->orderBy('name')->get(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'period_id'  => 'required|exists:accounting_periods,id',
            'entry_date' => 'required|date',
            'memo'       => 'required|string|max:255',
            'notes'      => 'nullable|string',
            'lines'      => 'required|array|min:2',
            'lines.*.account_id' => 'required|exists:chart_of_accounts,id',
            'lines.*.type'       => 'required|in:debit,credit',
            'lines.*.amount'     => 'required|numeric|min:0.01',
            'lines.*.description'=> 'nullable|string',
            'lines.*.project_id' => 'nullable|exists:projects,id',
        ]);

        $je = JournalEntry::create([
            'period_id'           => $data['period_id'],
            'entry_date'          => $data['entry_date'],
            'type'                => 'manual',
            'memo'                => $data['memo'],
            'notes'               => $data['notes'] ?? null,
            'functional_currency' => config('accounting.functional_currency', 'KES'),
            'created_by'          => Auth::id(),
            'status'              => 'draft',
        ]);

        foreach ($data['lines'] as $i => $line) {
            JournalEntryLine::create([
                'journal_entry_id' => $je->id,
                'account_id'       => $line['account_id'],
                'type'             => $line['type'],
                'amount'           => $line['amount'],
                'description'      => $line['description'] ?? null,
                'project_id'       => $line['project_id'] ?? null,
                'line_order'       => $i,
            ]);
        }

        if (!$je->isBalanced()) {
            $je->delete();
            return back()->with('error', sprintf(
                'Entry is not balanced: debits %.2f ≠ credits %.2f.',
                collect($data['lines'])->where('type', 'debit')->sum('amount'),
                collect($data['lines'])->where('type', 'credit')->sum('amount')
            ))->withInput();
        }

        return redirect()->route('web.journal-entries.show', $je)
            ->with('success', "Journal entry {$je->reference} created as draft.");
    }

    public function post(JournalEntry $journalEntry): RedirectResponse
    {
        try {
            $this->engine->post($journalEntry);
            return back()->with('success', "Entry {$journalEntry->reference} posted to ledger.");
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    public function reverse(Request $request, JournalEntry $journalEntry): RedirectResponse
    {
        $data = $request->validate([
            'memo'          => 'required|string|max:255',
            'reversal_date' => 'nullable|date',
        ]);

        try {
            $reversal = $this->engine->reverse(
                $journalEntry,
                $data['memo'],
                isset($data['reversal_date']) ? Carbon::parse($data['reversal_date']) : null
            );
            return redirect()->route('web.journal-entries.show', $reversal)
                ->with('success', "Reversal {$reversal->reference} posted.");
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    /** Post all unposted invoices/payments/expenses in one click. */
    public function postPending(): RedirectResponse
    {
        $posted = 0;
        $errors = [];

        Invoice::where('posting_status', 'unposted')->each(function ($inv) use (&$posted, &$errors) {
            try { $this->engine->postInvoice($inv); $posted++; }
            catch (\Throwable $e) { $errors[] = "Invoice {$inv->number}: {$e->getMessage()}"; }
        });

        Payment::where('posting_status', 'unposted')->each(function ($pmt) use (&$posted, &$errors) {
            try { $this->engine->postPayment($pmt); $posted++; }
            catch (\Throwable $e) { $errors[] = "Payment {$pmt->id}: {$e->getMessage()}"; }
        });

        Expense::where('posting_status', 'unposted')->each(function ($exp) use (&$posted, &$errors) {
            try { $this->engine->postExpense($exp); $posted++; }
            catch (\Throwable $e) { $errors[] = "Expense {$exp->id}: {$e->getMessage()}"; }
        });

        $msg = "{$posted} document(s) posted.";
        if ($errors) $msg .= ' Errors: ' . implode('; ', array_slice($errors, 0, 3));

        return back()->with($errors ? 'warning' : 'success', $msg);
    }
}

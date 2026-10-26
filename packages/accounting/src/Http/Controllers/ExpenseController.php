<?php

namespace Sledeci\Accounting\Http\Controllers;

use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Sledeci\Accounting\Models\Expense;
use Sledeci\Accounting\Services\Ocr\ReceiptOcrService;
use Sledeci\Core\Http\Controller;

/**
 * ExpenseController — refactored for receipt capture + offline sync
 *
 * Changes from original:
 *  1. store() accepts a 'receipt' file upload (image/*), stored privately
 *  2. store() honours an X-Idempotency-Key header from the offline queue
 *     to prevent duplicate expenses if the same action is replayed
 *  3. category validation now matches the fixed CATEGORIES list
 *  4. currency field added
 */
class ExpenseController extends Controller
{
    public function __construct(private ReceiptOcrService $ocr) {}

    public function index(Request $request): Response
    {
        $expenses = Expense::with('project:id,name')
            ->when($request->filled('project_id'), fn ($q) => $q->where('project_id', $request->project_id))
            ->when($request->filled('search'), fn ($q) => $q->where('description', 'like', "%{$request->search}%"))
            ->latest()
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('expenses/index', [
            'expenses' => $expenses,
            'filters' => $request->only(['project_id', 'search']),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('expenses/create', [
            'projects' => Project::select(['id', 'name'])->orderBy('name')->get(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'project_id' => ['nullable', 'exists:projects,id'],
            'description' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'size:3'],
            'date' => ['required', 'date'],
            'category' => ['nullable', 'string', 'in:travel,accommodation,software,hardware,meals,supplies,marketing,utilities,fuel,rent,other'],
            'notes' => ['nullable', 'string'],
            'receipt' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'], // 5MB
        ]);

        // ── Idempotency check (offline queue replay protection) ────────────────
        $idempotencyKey = $request->header('X-Idempotency-Key');
        if ($idempotencyKey) {
            $existing = Expense::where('idempotency_key', $idempotencyKey)->first();
            if ($existing) {
                return response()->json(['success' => true, 'expense_id' => $existing->id, 'duplicate' => true], 200);
            }
        }

        // Map frontend 'date' field to the model's 'incurred_at' column
        $data['incurred_at'] = $data['date'];
        unset($data['date']);

        $data['entered_by'] = Auth::id();
        $data['currency'] = $data['currency'] ?? config('company.functional_currency', 'KES');
        $data['category'] = $data['category'] ?? 'other';
        $data['idempotency_key'] = $idempotencyKey;

        // ── Receipt upload (online, full resolution) ────────────────────────────
        if ($request->hasFile('receipt')) {
            $path = $request->file('receipt')->store('receipts/'.now()->format('Y/m'), 'private');
            $data['receipt_path'] = $path;
        }

        // ── Receipt thumbnail (offline-queued, base64 from compressed capture) ──
        if ($request->filled('receipt_thumbnail') && empty($data['receipt_path'])) {
            $data['receipt_path'] = $this->storeBase64Thumbnail($request->input('receipt_thumbnail'));
            $data['receipt_pending_upload'] = $request->boolean('receipt_pending_upload');
            $data['receipt_filename_hint'] = $request->input('receipt_filename');
        }

        $expense = Expense::create($data);

        // Idempotent endpoints used by the offline queue expect JSON
        if ($idempotencyKey) {
            return response()->json(['success' => true, 'expense_id' => $expense->id], 201);
        }

        return redirect()->route('web.expenses.index')->with('success', 'Expense recorded.');
    }

    public function show(Expense $expense): Response
    {
        return Inertia::render('expenses/show', [
            'expense' => $expense->load('project:id,name'),
            'receipt_url' => $expense->receipt_path
                ? Storage::disk('private')->temporaryUrl($expense->receipt_path, now()->addMinutes(30))
                : null,
        ]);
    }

    public function edit(Expense $expense): Response
    {
        return Inertia::render('expenses/edit', [
            'expense' => $expense,
            'projects' => Project::select(['id', 'name'])->orderBy('name')->get(),
        ]);
    }

    public function update(Request $request, Expense $expense)
    {
        $data = $request->validate([
            'project_id' => ['nullable', 'exists:projects,id'],
            'description' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'size:3'],
            'date' => ['required', 'date'],
            'category' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
            'receipt' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);

        // Map frontend 'date' field to the model's 'incurred_at' column
        $data['incurred_at'] = $data['date'];
        unset($data['date']);

        if ($request->hasFile('receipt')) {
            if ($expense->receipt_path) {
                Storage::disk('private')->delete($expense->receipt_path);
            }
            $data['receipt_path'] = $request->file('receipt')->store('receipts/'.now()->format('Y/m'), 'private');
            $data['receipt_pending_upload'] = false;
        }

        $expense->update($data);

        return redirect()->route('web.expenses.index')->with('success', 'Expense updated.');
    }

    public function destroy(Expense $expense)
    {
        if ($expense->receipt_path) {
            Storage::disk('private')->delete($expense->receipt_path);
        }
        $expense->delete();

        return redirect()->route('web.expenses.index')->with('success', 'Expense deleted.');
    }

    /**
     * POST /expenses/ocr — extract structured data from a receipt image
     * before the expense is created, so the create form can be pre-filled.
     * Accepts either a multipart 'receipt' file or a 'receipt_thumbnail'
     * base64 data URL (matching the offline-capture flow used in store()).
     */
    public function extractReceipt(Request $request): JsonResponse
    {
        $request->validate([
            'receipt' => ['required_without:receipt_thumbnail', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'receipt_thumbnail' => ['required_without:receipt', 'string'],
        ]);

        if ($request->hasFile('receipt')) {
            $file = $request->file('receipt');
            $mime = $file->getMimeType();
            $base64 = base64_encode(file_get_contents($file->getRealPath()));
            $dataUrl = "data:{$mime};base64,{$base64}";
        } else {
            $dataUrl = $request->input('receipt_thumbnail');
        }

        $extracted = $this->ocr->extractFromDataUrl($dataUrl);

        return response()->json(['data' => $extracted]);
    }

    /**
     * POST /expenses/{expense}/ocr-apply — apply previously-extracted OCR
     * fields onto an existing expense. Only fills fields the user hasn't
     * already set (see ReceiptOcrService::applyToExpense).
     */
    public function applyOcr(Request $request, Expense $expense): JsonResponse
    {
        $extracted = $request->validate([
            'vendor' => ['nullable', 'string'],
            'amount' => ['nullable', 'numeric'],
            'currency' => ['nullable', 'string', 'size:3'],
            'date' => ['nullable', 'date'],
            'category' => ['nullable', 'string'],
            'description' => ['nullable', 'string'],
            'vat' => ['nullable', 'numeric'],
        ]);

        // applyToExpense reads every key directly, so make sure they all exist.
        $extracted = array_merge([
            'vendor' => null, 'amount' => null, 'currency' => null,
            'date' => null, 'category' => null, 'description' => null, 'vat' => null,
        ], $extracted);

        $this->ocr->applyToExpense($expense, $extracted);

        return response()->json(['data' => $expense->fresh()]);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /**
     * Store a base64 data URL (from offline receipt compression) as a file.
     */
    private function storeBase64Thumbnail(string $dataUrl): ?string
    {
        if (! preg_match('/^data:image\/(\w+);base64,(.+)$/', $dataUrl, $matches)) {
            return null;
        }

        $extension = $matches[1] === 'jpeg' ? 'jpg' : $matches[1];
        $content = base64_decode($matches[2]);
        $filename = 'receipts/'.now()->format('Y/m').'/'.Str::uuid().'.'.$extension;

        Storage::disk('private')->put($filename, $content);

        return $filename;
    }
}

<?php

namespace App\Traits;

use App\Services\Ocr\ReceiptOcrService;
use App\Models\Expense;
use Illuminate\Http\Request;
use Illiminate\Facade\Storage;

trait ExpenseOcrAddendum
{
    /**
     * POST /expenses/ocr
     *
     * Accepts either:
     *  a) A file upload (receipt image from file picker)
     *  b) A base64 data URL (from the camera capture / offline compressed thumbnail)
     *
     * Returns extracted fields as JSON — the frontend pre-fills the form.
     */
    public function extractReceipt(Request $request)
    {
        $ocr = app(ReceiptOcrService::class);
 
        // Option A: uploaded file
        if ($request->hasFile('receipt')) {
            $request->validate(['receipt' => 'required|image|mimes:jpg,jpeg,png,webp|max:5120']);
 
            $path = $request->file('receipt')->store('receipts/ocr-tmp', 'private');
 
            try {
                $result = $ocr->extractFromPath($path);
            } finally {
                // Delete temp file — we don't persist OCR-only uploads
                Storage::disk('private')->delete($path);
            }
 
            return response()->json(['success' => true, 'data' => $result]);
        }
 
        // Option B: base64 data URL (from camera capture in the browser)
        if ($request->filled('image_data')) {
            $request->validate(['image_data' => 'required|string']);
 
            try {
                $result = $ocr->extractFromDataUrl($request->input('image_data'));
            } catch (\InvalidArgumentException $e) {
                return response()->json(['error' => $e->getMessage()], 422);
            }
 
            return response()->json(['success' => true, 'data' => $result]);
        }
 
        // Option C: apply OCR to an already-saved expense receipt
        if ($request->filled('expense_id')) {
            $expense = Expense::findOrFail($request->input('expense_id'));
 
            if (! $expense->receipt_path) {
                return response()->json(['error' => 'No receipt attached to this expense.'], 422);
            }
 
            $result = $ocr->extractFromPath($expense->receipt_path);
            $ocr->applyToExpense($expense, $result);
 
            return response()->json(['success' => true, 'data' => $result, 'expense' => $expense->fresh()]);
        }
 
        return response()->json(['error' => 'No receipt provided. Send receipt (file), image_data (base64), or expense_id.'], 422);
    }
}
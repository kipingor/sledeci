<?php

namespace App\Services\Ocr;

use App\Models\Expense;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

/**
 * ReceiptOcrService
 *
 * Uses Claude claude-sonnet-4-6 (Anthropic Vision) to extract structured data
 * from a receipt photo captured via expenses/create.tsx.
 *
 * Returns a normalised array of extracted fields that pre-populate the
 * expense form on the frontend, saving the user manual data entry.
 *
 * Called from:
 *   ExpenseController::extractReceipt()  — POST /expenses/ocr
 *   (add route: Route::post('/expenses/ocr', [ExpenseController::class, 'extractReceipt']))
 */
class ReceiptOcrService
{
    private const MODEL     = 'claude-sonnet-4-6';
    private const MAX_TOKENS = 512;

    /**
     * Extract structured expense data from a stored receipt image.
     *
     * @param  string  $imagePath   Storage path (private disk) to the receipt image
     * @return array{
     *   vendor: string|null,
     *   amount: float|null,
     *   currency: string|null,
     *   date: string|null,
     *   category: string|null,
     *   description: string|null,
     *   vat: float|null,
     *   confidence: string,
     *   raw: string,
     * }
     */
    public function extractFromPath(string $imagePath): array
    {
        $imageData  = Storage::disk('private')->get($imagePath);
        $mimeType   = $this->detectMimeType($imagePath, $imageData);
        $base64     = base64_encode($imageData);

        return $this->extract($base64, $mimeType);
    }

    /**
     * Extract from a raw base64 data URL (used directly from the frontend
     * when the image is already in memory, e.g. the offline-compressed thumbnail).
     *
     * @param  string  $dataUrl  e.g. "data:image/jpeg;base64,/9j/..."
     */
    public function extractFromDataUrl(string $dataUrl): array
    {
        if (! preg_match('/^data:(image\/[a-z]+);base64,(.+)$/', $dataUrl, $m)) {
            throw new \InvalidArgumentException('Invalid data URL format.');
        }
        return $this->extract($m[2], $m[1]);
    }

    // ── Core extraction ────────────────────────────────────────────────────

    private function extract(string $base64Image, string $mimeType): array
    {
        $prompt = <<<'PROMPT'
You are extracting structured data from a receipt or invoice image.

Return ONLY a valid JSON object (no markdown, no explanation) with these fields:
{
  "vendor": "business name or null",
  "amount": total amount as a number or null,
  "currency": "3-letter ISO code e.g. KES, USD or null",
  "date": "YYYY-MM-DD or null",
  "category": one of [travel, accommodation, software, hardware, meals, supplies, marketing, utilities, fuel, rent, other] or null,
  "description": "brief description of what was purchased or null",
  "vat": VAT/tax amount as a number or null,
  "confidence": "high", "medium", or "low"
}

Rules:
- For currency: if you see KSh, Ksh, KES → "KES"; $ → "USD"; € → "EUR"; £ → "GBP"
- If the total is ambiguous (multiple totals), use the largest final total
- For category, make your best guess from what was purchased
- Set confidence to "high" if all key fields (vendor, amount, date) are clear
PROMPT;

        try {
            $response = Http::withHeaders([
                'x-api-key'         => config('services.anthropic.api_key'),
                'anthropic-version' => '2023-06-01',
                'content-type'      => 'application/json',
            ])->timeout(30)->post('https://api.anthropic.com/v1/messages', [
                'model'      => self::MODEL,
                'max_tokens' => self::MAX_TOKENS,
                'messages'   => [[
                    'role'    => 'user',
                    'content' => [
                        [
                            'type'   => 'image',
                            'source' => [
                                'type'       => 'base64',
                                'media_type' => $mimeType,
                                'data'       => $base64Image,
                            ],
                        ],
                        ['type' => 'text', 'text' => $prompt],
                    ],
                ]],
            ]);

            if ($response->failed()) {
                throw new \RuntimeException('Claude API error: ' . $response->status() . ' ' . $response->body());
            }

            $rawText = $response->json('content.0.text', '');
            $parsed  = json_decode($rawText, true);

            if (! is_array($parsed)) {
                Log::warning('ReceiptOcrService: could not parse Claude response', ['raw' => $rawText]);
                return $this->emptyResult($rawText);
            }

            return [
                'vendor'      => $parsed['vendor']      ?? null,
                'amount'      => isset($parsed['amount']) ? (float) $parsed['amount'] : null,
                'currency'    => $parsed['currency']    ?? null,
                'date'        => $parsed['date']        ?? null,
                'category'    => $parsed['category']    ?? null,
                'description' => $parsed['description'] ?? null,
                'vat'         => isset($parsed['vat']) ? (float) $parsed['vat'] : null,
                'confidence'  => $parsed['confidence']  ?? 'low',
                'raw'         => $rawText,
            ];
        } catch (\Throwable $e) {
            Log::error('ReceiptOcrService failed', ['error' => $e->getMessage()]);
            return $this->emptyResult($e->getMessage());
        }
    }

    // ── Apply extracted data to an Expense record ──────────────────────────

    /**
     * Pre-fill an expense with OCR-extracted data.
     * Only overwrites null / empty fields — does not overwrite user edits.
     *
     * @param  Expense  $expense
     * @param  array    $extracted  Return value from extract*()
     */
    public function applyToExpense(Expense $expense, array $extracted): void
    {
        $updates = [];

        if (empty($expense->description) && $extracted['description']) {
            $updates['description'] = $extracted['description'];
        }
        if (empty($expense->vendor) && $extracted['vendor']) {
            $updates['vendor'] = $extracted['vendor'];
        }
        if ((float)$expense->amount === 0.0 && $extracted['amount']) {
            $updates['amount'] = $extracted['amount'];
        }
        if ($extracted['currency']) {
            $updates['currency'] = $extracted['currency'];
        }
        if (empty($expense->incurred_at) && $extracted['date']) {
            $updates['incurred_at'] = $extracted['date'];
        }
        if (($expense->category === 'other' || empty($expense->category)) && $extracted['category']) {
            $updates['category'] = $extracted['category'];
        }

        if (! empty($updates)) {
            $expense->update($updates);
        }
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    private function detectMimeType(string $path, string $data): string
    {
        $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
        return match ($ext) {
            'jpg', 'jpeg' => 'image/jpeg',
            'png'         => 'image/png',
            'webp'        => 'image/webp',
            'gif'         => 'image/gif',
            default       => 'image/jpeg',
        };
    }

    private function emptyResult(string $raw = ''): array
    {
        return [
            'vendor' => null, 'amount' => null, 'currency' => null,
            'date'   => null, 'category' => null, 'description' => null,
            'vat'    => null, 'confidence' => 'low', 'raw' => $raw,
        ];
    }
}
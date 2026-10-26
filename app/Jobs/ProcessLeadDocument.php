<?php

namespace App\Jobs;

use App\Enums\LeadDocumentStatus;
use App\Events\LeadDocumentProcessed;
use App\Models\AuditLog;
use App\Models\LeadDocument;
use App\Services\AI\AiClientInterface;
use App\Services\DocumentParserService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;

class ProcessLeadDocument implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $documentId;

    /**
     * Create a new job instance.
     */
    public function __construct(int $documentId)
    {
        $this->documentId = $documentId;
    }

    /**
     * Execute the job.
     */
    public function handle(
        DocumentParserService $parser,
        AiClientInterface $client
    ): void {
        $document = LeadDocument::find($this->documentId);
        if (! $document) {
            return;
        }

        // mark processing
        try {
            $document->status = LeadDocumentStatus::PROCESSING;
            $document->save();
        } catch (\Throwable $e) {
            report($e);
        }

        // Determine absolute path
        $disk = Storage::disk('private');
        $absolutePath = method_exists($disk, 'path') ? $disk->path($document->storage_path) : storage_path('app/'.$document->storage_path);

        // Ensure we have extracted text
        $text = '';
        if (! empty($document->extracted_text) && is_array($document->extracted_text) && ! empty($document->extracted_text['text'])) {
            $text = $document->extracted_text['text'];
        } else {
            $text = $parser->extractText($absolutePath, $document->mime_type);
            if (! empty($text)) {
                $document->extracted_text = ['text' => $text];
                $document->save();
            }
        }

        if (empty($text)) {
            $document->status = LeadDocumentStatus::FAILED;
            $document->save();
            event(new LeadDocumentProcessed($document, LeadDocumentStatus::FAILED->value));

            return; // nothing to summarize
        }

        try {
            $prompt = "Summarize the following document into a concise summary (3-6 bullet points) and extract any clear requirements or action items.\n\nDocument:\n".mb_substr($text, 0, 30000);
            $summary = $client->chat($prompt, ['max_tokens' => 500, 'temperature' => 0.2]);

            $document->ai_summary = [
                'summary' => trim($summary),
                'generated_at' => now(),
            ];
            $document->status = LeadDocumentStatus::SUCCEEDED;
            $document->save();

            AuditLog::record(
                $document->lead,
                'document_summarized',
                [],
                ['description' => 'AI generated document summary', 'document_id' => $document->id],
                $document->lead->owner->id ?? null,
            );

            // Broadcast the result so UI can update in real-time
            event(new LeadDocumentProcessed($document, LeadDocumentStatus::SUCCEEDED->value));
        } catch (\Throwable $e) {
            report($e);
            try {
                $document->status = LeadDocumentStatus::FAILED;
                $document->save();
                event(new LeadDocumentProcessed($document, LeadDocumentStatus::FAILED->value));
            } catch (\Throwable $inner) {
                report($inner);
            }
        }
    }
}

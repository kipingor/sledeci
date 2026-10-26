<?php

namespace App\Services\Lead;

use App\Enums\LeadDocumentStatus;
use App\Events\LeadDocumentUploaded;
use App\Models\Lead;
use App\Models\LeadDocument;
use App\Services\DocumentParserService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class LeadDocumentService
{
    /**
     * @param  DocumentParserService|null  $parser  Reserved for future inline
     *                                              text-extraction on upload. Not required by any method today —
     *                                              kept optional so `new LeadDocumentService(new DocumentParserService())`
     *                                              (as called from Api\V1\LeadDocumentController) keeps working.
     */
    public function __construct(private readonly ?DocumentParserService $parser = null) {}

    /**
     * Upload and store a lead document.
     *
     * @param  array  $additionalData  Optional extra data; 'metadata' key merged into the record's metadata.
     */
    public function upload(Lead $lead, UploadedFile $file, array $additionalData = []): LeadDocument
    {
        return DB::transaction(function () use ($lead, $file, $additionalData) {
            $path = $file->store('lead-documents/'.$lead->id, 'private');

            $document = LeadDocument::create([
                'lead_id' => $lead->id,
                'filename' => basename($path),
                'original_name' => $file->getClientOriginalName(),
                'mime_type' => $file->getClientMimeType(),
                'size' => $file->getSize(),
                'storage_path' => $path,
                'status' => LeadDocumentStatus::QUEUED->value,
                'metadata' => $additionalData['metadata'] ?? null,
            ]);

            event(new LeadDocumentUploaded($lead->id, $document->id));

            return $document;
        });
    }

    /**
     * Replace the file content of an existing document (used by update flows).
     * Deletes the old stored file and resets processing status, since the
     * content has changed and any previous extraction/summary is stale.
     */
    public function replaceFile(LeadDocument $document, UploadedFile $file): LeadDocument
    {
        return DB::transaction(function () use ($document, $file) {
            if ($document->storage_path && Storage::disk('private')->exists($document->storage_path)) {
                Storage::disk('private')->delete($document->storage_path);
            }

            $path = $file->store('lead-documents/'.$document->lead_id, 'private');

            $document->update([
                'filename' => basename($path),
                'original_name' => $file->getClientOriginalName(),
                'mime_type' => $file->getClientMimeType(),
                'size' => $file->getSize(),
                'storage_path' => $path,
                'status' => LeadDocumentStatus::QUEUED->value,
                'extracted_text' => null,
                'ai_summary' => null,
            ]);

            return $document->fresh();
        });
    }

    public function find(int $documentId): LeadDocument
    {
        return LeadDocument::findOrFail($documentId);
    }

    public function getByLead(Lead $lead)
    {
        return $lead->leadDocuments()->latest()->get();
    }

    public function updateMetadata(LeadDocument $document, array $metadata): LeadDocument
    {
        $currentMetadata = $document->metadata ?? [];
        $updatedMetadata = array_merge($currentMetadata, $metadata);

        $document->update(['metadata' => $updatedMetadata]);

        return $document->fresh();
    }

    public function markProcessingFailed(LeadDocument $document, string $errorMessage): LeadDocument
    {
        $metadata = $document->metadata ?? [];
        $metadata['processing_error'] = $errorMessage;
        $metadata['processing_failed_at'] = now()->toISOString();
        $metadata['processing_attempts'] = ($metadata['processing_attempts'] ?? 0) + 1;

        $document->update([
            'status' => LeadDocumentStatus::FAILED->value,
            'metadata' => $metadata,
        ]);

        return $document->fresh();
    }

    public function markProcessingSuccess(LeadDocument $document): LeadDocument
    {
        $metadata = $document->metadata ?? [];
        $metadata['processing_succeeded_at'] = now()->toISOString();
        unset($metadata['processing_error']);

        $document->update([
            'status' => LeadDocumentStatus::SUCCEEDED->value,
            'metadata' => $metadata,
        ]);

        return $document->fresh();
    }

    public function delete(LeadDocument $document): bool
    {
        return DB::transaction(function () use ($document) {
            if ($document->storage_path && Storage::disk('private')->exists($document->storage_path)) {
                Storage::disk('private')->delete($document->storage_path);
            }

            return (bool) $document->delete();
        });
    }

    public function getDownloadUrl(LeadDocument $document, int $expirationMinutes = 60): string
    {
        return Storage::disk('private')->temporaryUrl(
            $document->storage_path,
            now()->addMinutes($expirationMinutes)
        );
    }

    public function getFilePath(LeadDocument $document): string
    {
        return Storage::disk('private')->path($document->storage_path);
    }

    public function fileExists(LeadDocument $document): bool
    {
        return $document->storage_path && Storage::disk('private')->exists($document->storage_path);
    }

    public function getFileContents(LeadDocument $document): string
    {
        if (! $this->fileExists($document)) {
            throw new \Exception('Document file not found');
        }

        return Storage::disk('private')->get($document->storage_path);
    }

    public function updateExtractedText(LeadDocument $document, string $text): LeadDocument
    {
        $document->update(['extracted_text' => ['text' => $text]]);

        return $document->fresh();
    }

    public function getByProcessingStatus(LeadDocumentStatus $status)
    {
        return LeadDocument::where('status', $status->value)
            ->with('lead')
            ->latest()
            ->get();
    }

    public function getUnprocessed()
    {
        return $this->getByProcessingStatus(LeadDocumentStatus::PENDING);
    }

    public function getProcessed()
    {
        return $this->getByProcessingStatus(LeadDocumentStatus::SUCCEEDED);
    }

    public function searchByFilename(string $query)
    {
        return LeadDocument::where('original_name', 'like', "%{$query}%")
            ->with('lead')
            ->latest()
            ->get();
    }

    public function searchInText(string $query)
    {
        return LeadDocument::whereNotNull('extracted_text')
            ->where('extracted_text', 'like', "%{$query}%")
            ->with('lead')
            ->latest()
            ->get();
    }

    public function getByMimeType(string $mimeType)
    {
        return LeadDocument::where('mime_type', $mimeType)
            ->with('lead')
            ->latest()
            ->get();
    }

    public function getStatistics(): array
    {
        return [
            'total' => LeadDocument::count(),
            'succeeded' => LeadDocument::where('status', LeadDocumentStatus::SUCCEEDED->value)->count(),
            'pending' => LeadDocument::where('status', LeadDocumentStatus::PENDING->value)->count(),
            'failed' => LeadDocument::where('status', LeadDocumentStatus::FAILED->value)->count(),
            'total_size' => LeadDocument::sum('size'),
            'by_mime_type' => LeadDocument::select('mime_type', DB::raw('count(*) as count'))
                ->groupBy('mime_type')
                ->get()
                ->pluck('count', 'mime_type')
                ->toArray(),
        ];
    }

    public function duplicateToLead(LeadDocument $document, Lead $targetLead): LeadDocument
    {
        return DB::transaction(function () use ($document, $targetLead) {
            $extension = pathinfo($document->filename, PATHINFO_EXTENSION);
            $newPath = 'lead-documents/'.$targetLead->id.'/'.Str::random(40)
                .($extension ? '.'.$extension : '');

            Storage::disk('private')->copy($document->storage_path, $newPath);

            return LeadDocument::create([
                'lead_id' => $targetLead->id,
                'filename' => basename($newPath),
                'original_name' => $document->original_name,
                'mime_type' => $document->mime_type,
                'size' => $document->size,
                'storage_path' => $newPath,
                'status' => LeadDocumentStatus::QUEUED->value,
                'extracted_text' => $document->extracted_text,
                'metadata' => array_merge(
                    $document->metadata ?? [],
                    ['duplicated_from' => $document->id]
                ),
            ]);
        });
    }

    /**
     * @param  int[]  $documentIds
     * @return int Number of documents deleted.
     */
    public function bulkDelete(array $documentIds): int
    {
        $documents = LeadDocument::whereIn('id', $documentIds)->get();
        $deleted = 0;

        foreach ($documents as $document) {
            if ($this->delete($document)) {
                $deleted++;
            }
        }

        return $deleted;
    }

    public function getNeedingReprocessing(int $daysOld = 30)
    {
        return LeadDocument::where(function ($query) {
            $query->where('status', LeadDocumentStatus::FAILED->value);
        })
            ->orWhere(function ($query) use ($daysOld) {
                $query->where('status', LeadDocumentStatus::PENDING->value)
                    ->where('created_at', '<', now()->subDays($daysOld));
            })
            ->with('lead')
            ->get();
    }

    /**
     * Validate file before upload.
     */
    public function validateFile(
        UploadedFile $file,
        array $allowedExtensions = ['pdf', 'doc', 'docx', 'txt', 'csv'],
        int $maxSize = 10485760 // 10MB
    ): array {
        $errors = [];

        $extension = strtolower($file->getClientOriginalExtension());
        if (! in_array($extension, $allowedExtensions, true)) {
            $errors[] = "File type '{$extension}' is not allowed. Allowed types: ".implode(', ', $allowedExtensions);
        }

        if ($file->getSize() > $maxSize) {
            $maxSizeMB = round($maxSize / 1048576, 2);
            $errors[] = "File size exceeds maximum allowed size of {$maxSizeMB}MB";
        }

        $allowedMimes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
            'text/csv',
        ];
        $mimeType = $file->getMimeType();
        if (! in_array($mimeType, $allowedMimes, true)) {
            $errors[] = "Invalid file mime type: {$mimeType}";
        }

        return [
            'valid' => empty($errors),
            'errors' => $errors,
        ];
    }
}

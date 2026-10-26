<?php

namespace App\Services\Lead;

use App\Models\LeadDocument;
use App\Models\Lead;
use App\Services\AI\DocumentExtractionService;
use App\Events\LeadDocumentProcessed;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class LeadDocumentProcessingService
{
    public function __construct(
        protected DocumentExtractionService $extractionService,
        protected LeadDocumentService $documentService
    ) {}

    /**
     * Process a lead document with AI extraction
     */
    public function processDocument(LeadDocument $document): void
    {
        try {
            // Mark as processing
            $document->markAsProcessing();

            Log::info('Starting document processing', [
                'document_id' => $document->id,
                'lead_id' => $document->lead_id,
            ]);

            // Extract data from document
            $extractedData = $this->extractionService->extract($document);

            // Update document with extracted data
            $this->documentService->updateMetadata($document, [
                'extracted_text' => $extractedData['text'] ?? null,
                'entities' => $extractedData['entities'] ?? [],
                'keywords' => $extractedData['keywords'] ?? [],
                'confidence' => $extractedData['confidence'] ?? 0,
                'processed_at' => now(),
            ]);

            // Update extracted text
            $document->update([
                'extracted_text' => $extractedData['text'] ?? null,
                'ai_summary' => [
                    'summary' => $extractedData['summary'] ?? 'No summary available',
                    'entities' => $extractedData['entities'] ?? [],
                    'keywords' => $extractedData['keywords'] ?? [],
                ],
            ]);

            // Mark document as succeeded
            $document->markAsSucceeded();

            // Update lead with extracted insights
            $this->updateLeadFromExtractedData($document->lead, $extractedData);

            // Dispatch success event
            event(new LeadDocumentProcessed($document, $extractedData['summary'] ?? ''));

            Log::info('Document processed successfully', [
                'document_id' => $document->id,
                'confidence' => $extractedData['confidence'] ?? 0,
            ]);

        } catch (\Exception $e) {
            Log::error('Document processing failed', [
                'document_id' => $document->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            $this->documentService->markProcessingFailed($document, $e->getMessage());
            
            throw $e;
        }
    }

    /**
     * Update lead with insights from extracted document data
     */
    protected function updateLeadFromExtractedData(Lead $lead, array $extractedData): void
    {
        $metadata = $lead->metadata ?? [];

        // Add extracted entities to metadata
        if (!empty($extractedData['entities'])) {
            $metadata['extracted_entities'] = array_merge(
                $metadata['extracted_entities'] ?? [],
                $extractedData['entities']
            );
        }

        // Add keywords
        if (!empty($extractedData['keywords'])) {
            $metadata['keywords'] = array_unique(array_merge(
                $metadata['keywords'] ?? [],
                $extractedData['keywords']
            ));
        }

        // Extract budget/value if found
        if (!empty($extractedData['budget'])) {
            $metadata['estimated_budget'] = $extractedData['budget'];
        }

        // Extract timeline if found
        if (!empty($extractedData['timeline'])) {
            $metadata['timeline'] = $extractedData['timeline'];
        }

        // Extract requirements
        if (!empty($extractedData['requirements'])) {
            $metadata['requirements'] = $extractedData['requirements'];
        }

        // Update lead metadata
        $lead->update(['metadata' => $metadata]);
    }

    /**
     * Batch process multiple documents
     */
    public function batchProcess(array $documentIds): array
    {
        $results = [
            'success' => [],
            'failed' => [],
        ];

        foreach ($documentIds as $documentId) {
            try {
                $document = LeadDocument::findOrFail($documentId);
                $this->processDocument($document);
                $results['success'][] = $documentId;
            } catch (\Exception $e) {
                $results['failed'][] = [
                    'document_id' => $documentId,
                    'error' => $e->getMessage(),
                ];
            }
        }

        return $results;
    }

    /**
     * Reprocess a document (useful if AI extraction improves)
     */
    public function reprocessDocument(LeadDocument $document): void
    {
        // Reset processing status
        $document->update(['processed' => false]);

        // Process again
        $this->processDocument($document);
    }

    /**
     * Get processing status for a document
     */
    public function getProcessingStatus(LeadDocument $document): array
    {
        return [
            'processed' => $document->processed,
            'has_extracted_text' => !empty($document->extracted_text),
            'metadata' => $document->metadata,
            'file_info' => [
                'name' => $document->file_name,
                'type' => $document->file_type,
                'size' => $document->file_size,
            ],
        ];
    }

    /**
     * Extract text preview from document
     */
    public function getTextPreview(LeadDocument $document, int $length = 500): ?string
    {
        if (empty($document->extracted_text)) {
            return null;
        }

        return substr($document->extracted_text, 0, $length) 
            . (strlen($document->extracted_text) > $length ? '...' : '');
    }

    /**
     * Search within document text
     */
    public function searchInDocument(LeadDocument $document, string $query): array
    {
        if (empty($document->extracted_text)) {
            return [
                'found' => false,
                'matches' => [],
            ];
        }

        $text = $document->extracted_text;
        $query = strtolower($query);
        $textLower = strtolower($text);

        $matches = [];
        $offset = 0;

        while (($pos = strpos($textLower, $query, $offset)) !== false) {
            $contextStart = max(0, $pos - 50);
            $contextEnd = min(strlen($text), $pos + strlen($query) + 50);
            
            $matches[] = [
                'position' => $pos,
                'context' => substr($text, $contextStart, $contextEnd - $contextStart),
            ];

            $offset = $pos + 1;
        }

        return [
            'found' => !empty($matches),
            'count' => count($matches),
            'matches' => $matches,
        ];
    }
}
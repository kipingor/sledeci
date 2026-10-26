<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Lead\StoreLeadDocumentRequest;
use App\Models\Lead;
use App\Models\LeadDocument;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use App\Services\Lead\LeadDocumentService;

class LeadDocumentController extends Controller
{
    public function __construct(private readonly LeadDocumentService $documentService) {}

    /**
     * Upload a document for a lead.
     */
    public function store(StoreLeadDocumentRequest $request): JsonResponse
    {
        $lead = Lead::findOrFail($request->input('lead_id'));

        $file = $request->file('file');

        $document = $this->documentService->upload($lead, $file, [
            'metadata' => ['uploaded_by' => $request->user()?->id],
        ]);

        return response()->json([
            'message' => 'Document uploaded successfully',
            'data' => $document,
        ], 201);
    }

    /**
     * Get all documents for a lead.
     */
    public function index(Lead $lead): JsonResponse
    {
        $documents = $lead->leadDocuments()->latest()->get();

        return response()->json(['data' => $documents]);
    }

    /**
     * Get a single document's details.
     */
    public function show(LeadDocument $document): JsonResponse
    {
        $this->authorize('view', $document);

        return response()->json(['data' => $document]);
    }

    /**
     * Download the original file.
     */
    public function download(LeadDocument $document)
    {
        $this->authorize('view', $document);

        if (!$this->documentService->fileExists($document)) {
            return response()->json(['message' => 'Document file not found'], 404);
        }

        return Storage::disk('private')->download(
            $document->storage_path,
            $document->original_name
        );
    }

    /**
     * Delete a document.
     */
    public function destroy(LeadDocument $document, Request $request): JsonResponse
    {
        $this->authorize('delete', $document);

        $this->documentService->delete($document);

        return response()->json(['message' => 'Document deleted successfully']);
    }
}
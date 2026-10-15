<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\LeadDocumentStatus;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Http\JsonResponse;
use App\Models\Lead;
use App\Models\LeadDocument;
use App\Services\DocumentParserService;
use App\Jobs\ProcessLeadDocument;

class UploadController extends Controller
{
    public function uploadLeadDocument(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'file' => 'required|file|mimes:pdf,doc,docx,txt|max:10240',
            'lead_id' => 'nullable|exists:leads,id',
        ]);

        // A document may only be attached to a lead the user is allowed to modify.
        if (! empty($validated['lead_id'])) {
            $this->authorize('update', Lead::findOrFail($validated['lead_id']));
        }

        $file = $request->file('file');

        try {
            // Store once (previously stored twice, leaving an orphaned duplicate on disk)
            $path = $file->store('lead_documents', 'private');

            $doc = LeadDocument::create([
                'lead_id' => $request->input('lead_id'),
                'filename' => basename($path),
                'original_name' => $file->getClientOriginalName(),
                'mime_type' => $file->getClientMimeType(),
                'size' => $file->getSize(),
                'storage_path' => $path,
                'status' => LeadDocumentStatus::QUEUED,
            ]);

            // best-effort extract
            try {

                $disk = Storage::disk('private');
                $absolutePath = method_exists($disk, 'path') ? $disk->path($path) : storage_path('app/' . $path);
                $parser = new DocumentParserService();
                $text = $parser->extractText($absolutePath, $file->getClientMimeType());
                if (!empty($text)) {
                    $doc->extracted_text = ['text' => $text];
                    $doc->save();
                }
            } catch (\Throwable $e) {
                report($e);
            }

            // dispatch background job
            try {
                ProcessLeadDocument::dispatch($doc->id)->onConnection('database');
            } catch (\Throwable $e) {
                report($e);
            }
        } catch (\Throwable $e) {
            report($e);
            return response()->json([
                'ok' => false,
                'message' => 'Failed to upload document'
            ], 500);
        }

        return response()->json(['ok' => true, 'document' => $doc]);
    }
}

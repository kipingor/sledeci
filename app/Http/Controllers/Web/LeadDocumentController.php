<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Http\Requests\Lead\StoreLeadDocumentRequest;
use App\Http\Requests\Lead\UpdateLeadDocumentRequest;
use App\Models\Lead;
use App\Models\LeadDocument;
use App\Services\Lead\LeadDocumentService;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Query\Builder;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class LeadDocumentController extends Controller
{
    public function __construct(private readonly LeadDocumentService $documentService) {}

    public function index(Request $request)
    {
        $query = $this->getModelQuery(LeadDocument::class);
        $documents = $this->paginateDocuments($query, $request->input('per_page', 15));

        return $this->renderDocumentsView('documents.index', $documents);
    }

    public function create()
    {
        return Inertia::render('documents.create', $this->formOptions());
    }

    public function store(StoreLeadDocumentRequest $request)
    {
        $data = $request->validated();
        $document = $this->createDocument($data);

        return redirect()->route('documents.show', $document->id)
            ->with('success', 'Document created successfully');
    }

    public function show(LeadDocument $document)
    {
        return Inertia::render('documents.show', compact('document'));
    }

    public function edit(LeadDocument $document)
    {
        return Inertia::render('documents.edit', compact('document'));
    }

    public function update(UpdateLeadDocumentRequest $request, LeadDocument $document)
    {
        $data = $request->validated();
        $this->updateDocument($document, $data);

        return redirect()->route('documents.show', $document->id)
            ->with('success', 'Document updated successfully');
    }

    public function destroy(LeadDocument $document)
    {
        $this->authorize('delete', $document);

        $this->documentService->delete($document);

        return redirect()->route('documents.index')
            ->with('success', 'Document deleted successfully');
    }

    /**
     * Stream the original file to the browser as an attachment.
     */
    public function download(LeadDocument $document)
    {
        $this->authorize('view', $document);

        if (! $this->documentService->fileExists($document)) {
            abort(404, 'Document file not found.');
        }

        return Storage::disk('private')->download(
            $document->storage_path,
            $document->original_name
        );
    }

    /**
     * Stream the file inline (e.g. for viewing a PDF/image in the browser).
     */
    public function preview(LeadDocument $document)
    {
        $this->authorize('view', $document);

        if (! $this->documentService->fileExists($document)) {
            abort(404, 'Document file not found.');
        }

        return Storage::disk('private')->response(
            $document->storage_path,
            $document->original_name,
            ['Content-Type' => $document->mime_type ?? 'application/octet-stream']
        );
    }

    /**
     * Create a document from validated StoreLeadDocumentRequest data
     * (called by store() above).
     */
    private function createDocument(array $data): LeadDocument
    {
        $lead = Lead::findOrFail($data['lead_id']);

        return $this->documentService->upload($lead, $data['file'], [
            'metadata' => ['uploaded_by' => auth()->id()],
        ]);
    }

    /**
     * Update a document from validated UpdateLeadDocumentRequest data
     * (called by update() above). Replaces the file if a new one was
     * uploaded; re-parents the document to a different lead if lead_id changed.
     */
    private function updateDocument(LeadDocument $document, array $data): LeadDocument
    {
        if (isset($data['file'])) {
            $this->documentService->replaceFile($document, $data['file']);
        }

        if (isset($data['lead_id']) && (int) $data['lead_id'] !== (int) $document->lead_id) {
            $document->update(['lead_id' => (int) $data['lead_id']]);
        }

        return $document->fresh();
    }

    protected function formOptions(): array
    {
        return [
            'leads' => Lead::select('id', 'title')->orderByDesc('created_at')->limit(100)->get(),
        ];
    }

    protected function getModelQuery(string $modelClass): Builder
    {
        return $modelClass::query();
    }

    protected function orderByDesc(Builder $query, string $column): Builder
    {
        return $query->orderByDesc($column);
    }

    private function paginateDocuments(Builder $query, int $perPage)
    {
        return $query->paginate($perPage);
    }

    private function jsonResponse(Collection $documents)
    {
        return response()->json($documents);
    }

    private function renderDocumentsView(string $view, LengthAwarePaginator $documents)
    {
        return Inertia::render($view, [
            'documents' => $documents,
        ]);
    }
}

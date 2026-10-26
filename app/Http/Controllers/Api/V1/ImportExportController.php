<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ImportJob;
use App\Services\Import\LeadImportService;
use App\Jobs\ProcessLeadImport;
use App\Exports\LeadsExport;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Facades\Excel;
use Illuminate\Support\Facades\Auth;

class ImportExportController extends Controller
{
    public function __construct(
        protected LeadImportService $importService
    ) {}

    /**
     * Upload file and parse headers
     */
    public function uploadImportFile(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,xlsx,xls|max:10240', // 10MB max
        ]);

        try {
            $file = $request->file('file');
            $fileName = Str::uuid() . '.' . $file->getClientOriginalExtension();
            $filePath = $file->storeAs('imports', $fileName, 'local');

            // Parse file
            $parsed = $this->importService->parseFile($filePath);

            return response()->json([
                'success' => true,
                'data' => [
                    'file_path' => $filePath,
                    'file_name' => $file->getClientOriginalName(),
                    'headers' => $parsed['headers'],
                    'total_rows' => $parsed['total_rows'],
                    'preview' => $parsed['preview'],
                    'available_fields' => $this->importService->getAvailableFields(),
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Start import with field mapping
     */
    public function startImport(Request $request): JsonResponse
    {
        $request->validate([
            'file_path' => 'required|string',
            'file_name' => 'required|string',
            'field_mapping' => 'required|array',
            'total_rows' => 'required|integer',
            'options' => 'nullable|array',
            'options.duplicate_handling' => 'nullable|in:create,skip,update',
        ]);

        try {
            // Create import job
            $importJob = ImportJob::create([
                'user_id' => Auth::id(),
                'type' => 'lead',
                'file_path' => $request->file_path,
                'file_name' => $request->file_name,
                'total_rows' => $request->total_rows,
                'field_mapping' => $request->field_mapping,
                'options' => $request->options ?? [],
            ]);

            // Dispatch job to queue
            ProcessLeadImport::dispatch($importJob);

            return response()->json([
                'success' => true,
                'message' => 'Import started successfully',
                'data' => $importJob,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Get import job status
     */
    public function getImportStatus(ImportJob $importJob): JsonResponse
    {
        $this->authorize('view', $importJob);

        return response()->json([
            'success' => true,
            'data' => $importJob,
        ]);
    }

    /**
     * List user's import jobs
     */
    public function listImports(Request $request): JsonResponse
    {
        $perPage = $request->input('per_page', 20);
        
        $imports = ImportJob::where('user_id', Auth::id())
            ->where('type', 'lead')
            ->latest()
            ->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $imports->items(),
            'meta' => [
                'current_page' => $imports->currentPage(),
                'last_page' => $imports->lastPage(),
                'per_page' => $imports->perPage(),
                'total' => $imports->total(),
            ],
        ]);
    }

    /**
     * Delete import job
     */
    public function deleteImport(ImportJob $importJob): JsonResponse
    {
        $this->authorize('delete', $importJob);

        try {
            // Delete file
            if (Storage::exists($importJob->file_path)) {
                Storage::delete($importJob->file_path);
            }

            $importJob->delete();

            return response()->json([
                'success' => true,
                'message' => 'Import deleted successfully',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Export leads to Excel/CSV
     */
    public function export(Request $request)
    {
        $request->validate([
            'format' => 'required|in:xlsx,csv',
            'filters' => 'nullable|array',
        ]);

        try {
            $filters = $request->input('filters', []);
            $format = $request->input('format', 'xlsx');
            
            $fileName = 'leads_export_' . now()->format('Y-m-d_His') . '.' . $format;

            return Excel::download(
                new LeadsExport($filters),
                $fileName,
                $format === 'csv' ? \Maatwebsite\Excel\Excel::CSV : \Maatwebsite\Excel\Excel::XLSX
            );
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Get sample import template
     */
    public function downloadTemplate(): JsonResponse
    {
        $template = [
            ['Title', 'Description', 'Email', 'Phone', 'Status', 'Source', 'Estimated Value', 'Owner Email'],
            ['Acme Corp', 'Interested in enterprise plan', 'contact@acme.com', '+1234567890', 'new', 'website', '50000', 'sales@example.com'],
            ['TechStart Inc', 'Looking for startup package', 'hello@techstart.com', '+0987654321', 'contacted', 'referral', '25000', 'sales@example.com'],
        ];

        return response()->json([
            'success' => true,
            'data' => [
                'template' => $template,
                'fields' => $this->importService->getAvailableFields(),
                'statuses' => array_map(fn($s) => [
                    'value' => $s->value,
                    'label' => $s->label(),
                ], \App\Enums\LeadStatus::cases()),
            ],
        ]);
    }
}
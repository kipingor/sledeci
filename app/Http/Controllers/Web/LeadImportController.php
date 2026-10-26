<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use App\Services\Import\LeadImportService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Throwable;

/**
 * One-shot lead import (CSV / XLS / XLSX) used by the bulk-lead-import component.
 *
 * Columns are mapped automatically from the header row using
 * LeadImportService::parseFile(); rows that fail validation are skipped and
 * reported back through the shared `flash.importResult` prop.
 */
class LeadImportController extends Controller
{
    private const MAX_ERRORS_REPORTED = 20;

    public function store(Request $request, LeadImportService $importer): RedirectResponse
    {
        $this->authorize('create', Lead::class);

        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt,xls,xlsx', 'max:10240'],
        ]);

        $path = $request->file('file')->store('imports/leads');

        try {
            $parsed = $importer->parseFile($path);

            $mapping = [];
            foreach ($parsed['headers'] as $header) {
                if (! empty($header['suggested_field'])) {
                    $mapping[$header['index']] = $header['suggested_field'];
                }
            }

            if (! in_array('title', $mapping, true)) {
                return back()->with('importResult', [
                    'success' => false,
                    'imported' => 0,
                    'failed' => 0,
                    'errors' => ['No column could be matched to the lead title. Add a "Title", "Name" or "Company" column.'],
                ]);
            }

            $rows = IOFactory::load(Storage::path($path))
                ->getActiveSheet()
                ->toArray(null, true, true, false);
            array_shift($rows); // header row

            $imported = 0;
            $failed = 0;
            $errors = [];

            foreach ($rows as $index => $row) {
                if (count(array_filter($row, fn ($v) => $v !== null && $v !== '')) === 0) {
                    continue; // blank line
                }

                $line = $index + 2; // 1-based, after the header
                $validated = $importer->validateRow($row, $mapping);

                if (! $validated['valid']) {
                    $failed++;
                    if (count($errors) < self::MAX_ERRORS_REPORTED) {
                        $errors[] = "Row {$line}: ".implode('; ', $validated['errors']);
                    }

                    continue;
                }

                $result = $importer->importLead($validated['data'], $request->user());

                if ($result['success'] ?? false) {
                    $imported++;
                } else {
                    $failed++;
                    if (count($errors) < self::MAX_ERRORS_REPORTED) {
                        $errors[] = "Row {$line}: ".($result['error'] ?? 'Could not be imported.');
                    }
                }
            }

            return back()->with('importResult', [
                'success' => $imported > 0 || $failed === 0,
                'imported' => $imported,
                'failed' => $failed,
                'errors' => $errors,
            ]);
        } catch (Throwable $e) {
            report($e);

            return back()->with('importResult', [
                'success' => false,
                'imported' => 0,
                'failed' => 0,
                'errors' => ['The file could not be read. Check that it is a valid CSV or Excel file.'],
            ]);
        } finally {
            Storage::delete($path);
        }
    }
}

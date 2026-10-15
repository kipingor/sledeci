<?php

namespace App\Jobs;

use App\Models\ImportJob;
use App\Services\Import\LeadImportService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpSpreadsheet\IOFactory;

class ProcessLeadImport implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $timeout = 3600; // 1 hour
    public $tries = 3;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public ImportJob $importJob
    ) {}

    /**
     * Execute the job.
     */
    public function handle(LeadImportService $importService): void
    {
        try {
            $this->importJob->markAsStarted();

            $filePath = Storage::path($this->importJob->file_path);
            $spreadsheet = IOFactory::load($filePath);
            $worksheet = $spreadsheet->getActiveSheet();

            $highestColumn = $worksheet->getHighestColumn();
            $highestColumnIndex = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::columnIndexFromString($highestColumn);
            $highestRow = $worksheet->getHighestRow();

            $fieldMapping = $this->importJob->field_mapping;
            $options = $this->importJob->options ?? [];

            $processed = 0;
            $successful = 0;
            $failed = 0;
            $errors = [];

            // Process each row (skip header)
            for ($row = 2; $row <= $highestRow; $row++) {
                $rowData = [];
                for ($col = 1; $col <= $highestColumnIndex; $col++) {
                    $rowData[] = $worksheet->getCellByColumnAndRow($col, $row)->getValue();
                }

                // Validate row
                $validation = $importService->validateRow($rowData, $fieldMapping);

                if (!$validation['valid']) {
                    $failed++;
                    $errors[] = [
                        'row' => $row,
                        'errors' => $validation['errors'],
                    ];
                } else {
                    // Import lead
                    $result = $importService->importLead(
                        $validation['data'],
                        $this->importJob->user,
                        $options
                    );

                    if ($result['success']) {
                        $successful++;
                    } else {
                        $failed++;
                        $errors[] = [
                            'row' => $row,
                            'errors' => [$result['error'] ?? 'Unknown error'],
                        ];
                    }
                }

                $processed++;

                // Update progress every 10 rows
                if ($processed % 10 === 0) {
                    $this->importJob->updateProgress($processed, $successful, $failed, $errors);
                }
            }

            // Final update
            $this->importJob->updateProgress($processed, $successful, $failed, $errors);
            $this->importJob->markAsCompleted();

        } catch (\Exception $e) {
            $this->importJob->markAsFailed($e->getMessage());
            throw $e;
        }
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        $this->importJob->markAsFailed($exception->getMessage());
    }
}
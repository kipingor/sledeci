<?php

namespace App\Services\Import;

use App\Models\ImportJob;
use App\Models\Lead;
use App\Models\User;
use App\Models\PipelineStage;
use App\Enums\LeadStatus;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use PhpOffice\PhpSpreadsheet\IOFactory;

class LeadImportService
{
    /**
     * Parse uploaded file and extract headers.
     */
    public function parseFile(string $filePath): array
    {
        $extension = pathinfo($filePath, PATHINFO_EXTENSION);
        $fullPath = Storage::path($filePath);

        try {
            $spreadsheet = IOFactory::load($fullPath);
            $worksheet = $spreadsheet->getActiveSheet();
            
            // Get first row as headers
            $headers = [];
            $highestColumn = $worksheet->getHighestColumn();
            $highestColumnIndex = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::columnIndexFromString($highestColumn);
            
            for ($col = 1; $col <= $highestColumnIndex; $col++) {
                $value = $worksheet->getCellByColumnAndRow($col, 1)->getValue();
                if ($value) {
                    $headers[] = [
                        'index' => $col - 1,
                        'name' => $value,
                        'suggested_field' => $this->suggestField($value),
                    ];
                }
            }

            // Get total row count (excluding header)
            $totalRows = $worksheet->getHighestRow() - 1;

            // Get preview data (first 5 rows)
            $preview = [];
            for ($row = 2; $row <= min(6, $worksheet->getHighestRow()); $row++) {
                $rowData = [];
                for ($col = 1; $col <= $highestColumnIndex; $col++) {
                    $rowData[] = $worksheet->getCellByColumnAndRow($col, $row)->getValue();
                }
                $preview[] = $rowData;
            }

            return [
                'headers' => $headers,
                'total_rows' => $totalRows,
                'preview' => $preview,
            ];
        } catch (\Exception $e) {
            throw new \Exception('Failed to parse file: ' . $e->getMessage());
        }
    }

    /**
     * Suggest field mapping based on header name.
     */
    private function suggestField(string $header): ?string
    {
        $header = strtolower(trim($header));
        
        $mappings = [
            'title' => ['title', 'name', 'lead name', 'company', 'company name'],
            'description' => ['description', 'desc', 'notes', 'details'],
            'email' => ['email', 'e-mail', 'email address'],
            'phone' => ['phone', 'telephone', 'mobile', 'contact number'],
            'status' => ['status', 'lead status', 'stage'],
            'source' => ['source', 'lead source', 'origin'],
            'estimated_value' => ['value', 'estimated value', 'deal value', 'amount'],
            'owner_email' => ['owner', 'assigned to', 'owner email', 'sales rep'],
        ];

        foreach ($mappings as $field => $patterns) {
            foreach ($patterns as $pattern) {
                if (str_contains($header, $pattern)) {
                    return $field;
                }
            }
        }

        return null;
    }

    /**
     * Get available fields for mapping.
     */
    public function getAvailableFields(): array
    {
        return [
            [
                'value' => 'title',
                'label' => 'Title',
                'required' => true,
                'type' => 'string',
            ],
            [
                'value' => 'description',
                'label' => 'Description',
                'required' => false,
                'type' => 'text',
            ],
            [
                'value' => 'email',
                'label' => 'Email',
                'required' => false,
                'type' => 'email',
            ],
            [
                'value' => 'phone',
                'label' => 'Phone',
                'required' => false,
                'type' => 'string',
            ],
            [
                'value' => 'status',
                'label' => 'Status',
                'required' => false,
                'type' => 'enum',
                'options' => array_map(fn($s) => $s->value, LeadStatus::cases()),
            ],
            [
                'value' => 'source',
                'label' => 'Source',
                'required' => false,
                'type' => 'string',
            ],
            [
                'value' => 'estimated_value',
                'label' => 'Estimated Value',
                'required' => false,
                'type' => 'number',
            ],
            [
                'value' => 'owner_email',
                'label' => 'Owner Email',
                'required' => false,
                'type' => 'email',
            ],
        ];
    }

    /**
     * Validate row data.
     */
    public function validateRow(array $data, array $fieldMapping): array
    {
        $mappedData = $this->mapRowData($data, $fieldMapping);

        $rules = [
            'title' => 'required|string|max:255',
            'description' => 'nullable|string|max:5000',
            'email' => 'nullable|email',
            'phone' => 'nullable|string|max:50',
            'status' => 'nullable|in:' . implode(',', array_map(fn($s) => $s->value, LeadStatus::cases())),
            'source' => 'nullable|string|max:100',
            'estimated_value' => 'nullable|numeric|min:0',
            'owner_email' => 'nullable|email',
        ];

        $validator = Validator::make($mappedData, $rules);

        if ($validator->fails()) {
            return [
                'valid' => false,
                'errors' => $validator->errors()->all(),
                'data' => $mappedData,
            ];
        }

        return [
            'valid' => true,
            'errors' => [],
            'data' => $mappedData,
        ];
    }

    /**
     * Map row data to lead fields.
     */
    private function mapRowData(array $rowData, array $fieldMapping): array
    {
        $mapped = [];

        foreach ($fieldMapping as $csvColumn => $leadField) {
            if ($leadField && isset($rowData[$csvColumn])) {
                $mapped[$leadField] = $rowData[$csvColumn];
            }
        }

        return $mapped;
    }

    /**
     * Import a single lead from mapped data.
     */
    public function importLead(array $data, User $user, array $options = []): array
    {
        try {
            // Find or create owner
            $ownerId = $user->id;
            if (!empty($data['owner_email'])) {
                $owner = User::where('email', $data['owner_email'])->first();
                if ($owner) {
                    $ownerId = $owner->id;
                }
            }
            unset($data['owner_email']);

            // Get default pipeline stage
            $pipelineStage = PipelineStage::where('key', 'new')->first();
            if (!$pipelineStage) {
                $pipelineStage = PipelineStage::first();
            }

            // Handle metadata fields
            $metadata = [];
            if (!empty($data['email'])) {
                $metadata['email'] = $data['email'];
                unset($data['email']);
            }
            if (!empty($data['phone'])) {
                $metadata['phone'] = $data['phone'];
                unset($data['phone']);
            }
            if (!empty($data['source'])) {
                $metadata['source'] = $data['source'];
                unset($data['source']);
            }

            // Check for duplicates if option is set
            if ($options['duplicate_handling'] ?? false) {
                $existing = Lead::where('title', $data['title'])
                    ->where('owner_id', $ownerId)
                    ->first();

                if ($existing) {
                    if ($options['duplicate_handling'] === 'skip') {
                        return [
                            'success' => false,
                            'skipped' => true,
                            'message' => 'Duplicate lead skipped',
                        ];
                    } elseif ($options['duplicate_handling'] === 'update') {
                        $existing->update($data);
                        if (!empty($metadata)) {
                            $existing->update([
                                'metadata' => array_merge($existing->metadata ?? [], $metadata),
                            ]);
                        }
                        return [
                            'success' => true,
                            'updated' => true,
                            'lead_id' => $existing->id,
                        ];
                    }
                }
            }

            // Create new lead
            $lead = Lead::create([
                ...$data,
                'owner_id' => $ownerId,
                'created_by' => $user->id,
                'pipeline_stage_id' => $pipelineStage->id,
                'status' => $data['status'] ?? LeadStatus::NEW,
                'metadata' => $metadata,
            ]);

            return [
                'success' => true,
                'created' => true,
                'lead_id' => $lead->id,
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Get duplicate detection options.
     */
    public function getDuplicateOptions(): array
    {
        return [
            [
                'value' => 'create',
                'label' => 'Create all (allow duplicates)',
            ],
            [
                'value' => 'skip',
                'label' => 'Skip duplicates',
            ],
            [
                'value' => 'update',
                'label' => 'Update existing',
            ],
        ];
    }
}
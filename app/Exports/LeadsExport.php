<?php

namespace App\Exports;

use App\Models\Lead;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class LeadsExport implements FromQuery, WithHeadings, WithMapping, WithStyles, ShouldAutoSize
{
    protected $filters;

    public function __construct(array $filters = [])
    {
        $this->filters = $filters;
    }

    /**
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function query()
    {
        $query = Lead::with(['owner', 'pipelineStage']);

        // Apply filters
        if (!empty($this->filters['status'])) {
            $query->where('status', $this->filters['status']);
        }

        if (!empty($this->filters['owner_id'])) {
            $query->where('owner_id', $this->filters['owner_id']);
        }

        if (!empty($this->filters['pipeline_stage_id'])) {
            $query->where('pipeline_stage_id', $this->filters['pipeline_stage_id']);
        }

        if (!empty($this->filters['search'])) {
            $query->where(function ($q) {
                $q->where('title', 'like', '%' . $this->filters['search'] . '%')
                  ->orWhere('description', 'like', '%' . $this->filters['search'] . '%');
            });
        }

        if (!empty($this->filters['created_from'])) {
            $query->where('created_at', '>=', $this->filters['created_from']);
        }

        if (!empty($this->filters['created_to'])) {
            $query->where('created_at', '<=', $this->filters['created_to']);
        }

        return $query->orderBy('created_at', 'desc');
    }

    /**
     * Define the headings.
     */
    public function headings(): array
    {
        return [
            'ID',
            'Title',
            'Description',
            'Status',
            'Pipeline Stage',
            'Owner',
            'Owner Email',
            'Email',
            'Phone',
            'Source',
            'Estimated Value',
            'Created At',
            'Updated At',
            'Contacted At',
            'Qualified At',
            'Won At',
            'Lost At',
        ];
    }

    /**
     * Map the data for each row.
     */
    public function map($lead): array
    {
        return [
            $lead->id,
            $lead->title,
            $lead->description,
            $lead->status->label(),
            $lead->pipelineStage->name ?? '',
            $lead->owner->name ?? '',
            $lead->owner->email ?? '',
            $lead->metadata['email'] ?? '',
            $lead->metadata['phone'] ?? '',
            $lead->metadata['source'] ?? '',
            $lead->estimated_value ?? '',
            $lead->created_at?->format('Y-m-d H:i:s'),
            $lead->updated_at?->format('Y-m-d H:i:s'),
            $lead->contacted_at?->format('Y-m-d H:i:s'),
            $lead->qualified_at?->format('Y-m-d H:i:s'),
            $lead->won_at?->format('Y-m-d H:i:s'),
            $lead->lost_at?->format('Y-m-d H:i:s'),
        ];
    }

    /**
     * Style the worksheet.
     */
    public function styles(Worksheet $sheet)
    {
        return [
            // Style the first row as header
            1 => [
                'font' => ['bold' => true, 'size' => 12],
                'fill' => [
                    'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                    'startColor' => ['rgb' => 'E2E8F0']
                ],
            ],
        ];
    }
}
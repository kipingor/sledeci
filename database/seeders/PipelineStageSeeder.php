<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\PipelineStage;

class PipelineStageSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $defaultStages = [
            ['key' => 'intake',      'name' => 'Intake',      'order' => 0, 'color' => '#3b82f6'],
            ['key' => 'discovery',   'name' => 'Discovery',   'order' => 1, 'color' => '#06b6d4'],
            ['key' => 'proposal',    'name' => 'Proposal',    'order' => 2, 'color' => '#8b5cf6'],
            ['key' => 'negotiation', 'name' => 'Negotiation', 'order' => 3, 'color' => '#f59e0b'],
            ['key' => 'closed_won',  'name' => 'Closed Won',  'order' => 4, 'color' => '#059669'],
            ['key' => 'closed_lost', 'name' => 'Closed Lost', 'order' => 5, 'color' => '#ef4444'],
        ];
        $pipelineStages = collect($defaultStages)->map(
            fn ($s) =>
            PipelineStage::firstOrCreate(['key' => $s['key']], $s)
        );
    }
}

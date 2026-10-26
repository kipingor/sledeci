<?php

namespace Database\Factories;

use App\Enums\LeadDocumentStatus;
use App\Models\Lead;
use App\Models\LeadDocument;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<LeadDocument>
 */
class LeadDocumentFactory extends Factory
{
    protected $model = LeadDocument::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $lead = Lead::inRandomOrder()->first()?->id ?? Lead::factory()->create()->id;

        return [
            'lead_id' => $lead,
            'filename' => $this->faker->word.'.'.$this->faker->fileExtension(),
            'original_name' => $this->faker->word.'.'.$this->faker->fileExtension(),
            'mime_type' => $this->faker->mimeType(),
            'size' => $this->faker->numberBetween(1, 1000),
            'storage_path' => $this->faker->word.'.'.$this->faker->fileExtension(),
            'status' => $this->faker->randomElement(LeadDocumentStatus::cases()),
            'extracted_text' => ['text' => $this->faker->paragraph()],
            'ai_summary' => $this->faker->paragraph(),

        ];
    }
}

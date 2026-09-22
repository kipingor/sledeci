<?php

namespace Database\Factories;

use App\Models\Deal;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Deal>
 */
class DealFactory extends Factory
{
    protected $model = Deal::class;

    public function definition(): array
    {
        return [
            'tenant_id'           => Tenant::factory(),
            'title'               => $this->faker->sentence(4),
            'value'               => $this->faker->randomFloat(2, 5000, 5_000_000),
            'currency'            => 'KES',
            'stage'               => $this->faker->randomElement(Deal::STAGES),
            'expected_close_date' => $this->faker->optional()->dateTimeBetween('now', '+6 months'),
            'closed_at'           => null,
            'notes'               => null,
            'contact_id'          => null,
            'company_id'          => null,
            'owner_id'            => null,
        ];
    }

    public function forTenant(Tenant $tenant): static
    {
        return $this->state(['tenant_id' => $tenant->id]);
    }

    public function won(): static
    {
        return $this->state([
            'stage'     => 'won',
            'closed_at' => now(),
        ]);
    }

    public function lost(): static
    {
        return $this->state([
            'stage'     => 'lost',
            'closed_at' => now(),
        ]);
    }

    public function open(): static
    {
        return $this->state([
            'stage'     => 'new',
            'closed_at' => null,
        ]);
    }
}
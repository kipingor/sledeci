<?php

namespace Database\Factories;

use App\Models\Activity;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Activity>
 */
class ActivityFactory extends Factory
{
    protected $model = Activity::class;

    public function definition(): array
    {
        return [
            'tenant_id'   => Tenant::factory(),
            'type'        => $this->faker->randomElement(Activity::TYPES),
            'subject'     => $this->faker->sentence(5),
            'body'        => $this->faker->optional()->paragraph(),
            'due_at'      => $this->faker->optional()->dateTimeBetween('now', '+2 weeks'),
            'done_at'     => null,
            'actable_type' => null,
            'actable_id'   => null,
            'owner_id'     => null,
        ];
    }

    public function forTenant(Tenant $tenant): static
    {
        return $this->state(['tenant_id' => $tenant->id]);
    }

    public function done(): static
    {
        return $this->state(['done_at' => now()]);
    }

    public function forContact(\App\Models\Contact $contact): static
    {
        return $this->state([
            'actable_type' => Contact::class,
            'actable_id'   => $contact->id,
        ]);
    }

    public function forDeal(\App\Models\Deal $deal): static
    {
        return $this->state([
            'actable_type' => \App\Models\Deal::class,
            'actable_id'   => $deal->id,
        ]);
    }
}

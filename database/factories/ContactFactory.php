<?php

namespace Database\Factories;

use App\Models\Contact;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Contact>
 */
class ContactFactory extends Factory
{
    protected $model = Contact::class;

    public function definition(): array
    {
        return [
            'tenant_id'  => Tenant::factory(),
            'first_name' => $this->faker->firstName(),
            'last_name'  => $this->faker->lastName(),
            'email'      => $this->faker->optional()->safeEmail(),
            'phone'      => $this->faker->optional()->phoneNumber(),
            'job_title'  => $this->faker->optional()->jobTitle(),
            'company_id' => null,
            'stage'      => $this->faker->randomElement(['lead', 'prospect', 'customer', 'churned']),
            'source'     => $this->faker->randomElement([
                'website', 'referral', 'social', 'email', 'phone', 'event', 'other',
            ]),
            'notes'    => null,
            'owner_id' => null,
        ];
    }

    public function forTenant(Tenant $tenant): static
    {
        return $this->state(['tenant_id' => $tenant->id]);
    }

    public function lead(): static
    {
        return $this->state(['stage' => 'lead']);
    }

    public function customer(): static
    {
        return $this->state(['stage' => 'customer']);
    }
}

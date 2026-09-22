<?php

namespace Database\Factories;

use App\Models\Company;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Company>
 */
class CompanyFactory extends Factory
{
    protected $model = Company::class;

    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'name'      => $this->faker->company(),
            'industry'  => $this->faker->randomElement([
                'Technology', 'Finance', 'Healthcare', 'Agriculture',
                'Retail', 'Manufacturing', 'Education', 'Logistics',
            ]),
            'website'  => $this->faker->optional()->url(),
            'phone'    => $this->faker->optional()->phoneNumber(),
            'email'    => $this->faker->optional()->companyEmail(),
            'address'  => $this->faker->optional()->address(),
            'notes'    => null,
            'owner_id' => null,
        ];
    }

    public function forTenant(Tenant $tenant): static
    {
        return $this->state(['tenant_id' => $tenant->id]);
    }
}

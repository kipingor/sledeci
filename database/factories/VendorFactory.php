<?php

namespace Database\Factories;

use App\Models\Vendor;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class VendorFactory extends Factory
{
    protected $model = Vendor::class;

    public function definition(): array
    {
        $createdAt = fake()->dateTimeBetween('-6 months', 'now');

        return [
            'name' => fake()->company(),
            'category' => fake()->randomElement([
                // Schema typo fix: original migration category spelling
                'Construction',
                'IT Services',
                'Facility Management',
                'Security',
                'Transportation',
                'Consulting',
                'Equipment Supply',
                'Electrical',
                'General Contractor',
                'Other',
            ]),
            'contact_info' => [
                'email' => fake()->companyEmail(),
                'phone' => '+2547'.$this->faker->numberBetween(10000000, 99999999),
                'address' => fake()->address(),
            ],
            'metadata' => [
                'tax_pin' => strtoupper(Str::random(8)),
                'contract_reference' => 'CTR-'.strtoupper(Str::random(6)),
                'notes' => fake()->sentence(),
            ],
            'status' => fake()->randomElement(['active', 'inactive']),
            'created_at' => $createdAt,
            'updated_at' => $createdAt,
        ];
    }

    /**
     * Mark as active vendor.
     */
    public function active(): Factory
    {
        return $this->state(fn () => ['status' => 'active']);
    }

    /**
     * Mark as inactive vendor.
     */
    public function inactive(): Factory
    {
        return $this->state(fn () => ['status' => 'inactive']);
    }
}

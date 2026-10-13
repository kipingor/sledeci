<?php

namespace Database\Factories;

use App\Models\Expense;
use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * Expense schema reference: 
 *   id, project_id, entered_by, vendor, description, amount, currency,
 *   incurred_at, receipt_path, lines, notes, timestamps, softDeletes
 */
class ExpenseFactory extends Factory
{
    protected $model = Expense::class;

    public function definition(): array
    {
        // Pick related project (nullable)
        $project = Project::inRandomOrder()->first();

        // Pick an 'entered_by' user (nullable)
        $enteredBy = User::inRandomOrder()->first();

        // Pick a random vendor (just a string in schema)
        $vendorNames = [
            'Acme Supplies', 'Nairobi Printworks', 'FastFoods Ltd', 'SuperChemicals',
            'Global Equip', 'IT Genius', 'Universal Hardware', 'ProCleaners',
            'Mega Transport', 'Smart Office', null
        ];

        // Optional: lines field example, as JSON
        $lineExamples = [
            null,
            [
                [
                    'label' => 'USB-C Adapter',
                    'quantity' => 2,
                    'unit_price' => 1450,
                    'total' => 2900
                ],
                [
                    'label' => 'HDMI Cable',
                    'quantity' => 1,
                    'unit_price' => 900,
                    'total' => 900
                ]
            ],
            [
                [
                    'label' => 'Consulting services May',
                    'quantity' => 1,
                    'unit_price' => 15000,
                    'total' => 15000
                ]
            ]
        ];

        $incurredAt = $this->faker->dateTimeBetween('-3 months', 'now');
        $currency = $this->faker->randomElement(['USD', 'KES', 'EUR']);

        $amount = $this->faker->randomFloat(2, 500, 20000);

        // Pick a random note maybe empty
        $notes = $this->faker->boolean(70) ? $this->faker->sentence() : null;

        return [
            'project_id'    => $project?->id,
            'entered_by'    => $enteredBy?->id,
            'vendor'        => $this->faker->randomElement($vendorNames),
            'description'   => $this->faker->sentence(),
            'amount'        => $amount,
            'currency'      => $currency,
            'incurred_at'   => $incurredAt,
            'receipt_path'  => null,
            'lines'         => $this->faker->randomElement($lineExamples),
            'notes'         => $notes,
            'created_at'    => $incurredAt,
            'updated_at'    => $incurredAt,
        ];
    }

    /**
     * Provide a state with filled receipt_path.
     */
    public function withReceipt(): Factory
    {
        return $this->state(function () {
            return [
                'receipt_path' => 'receipts/' . Str::random(20) . '.pdf',
            ];
        });
    }
}

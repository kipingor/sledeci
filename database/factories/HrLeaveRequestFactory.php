<?php

namespace Database\Factories;

use App\Models\HrLeaveRequest;
use App\Models\StaffProfile;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<HrLeaveRequest>
 */
class HrLeaveRequestFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'staff_profile_id' => StaffProfile::factory(),
            'from_date' => $this->faker->date(),
            'to_date' => $this->faker->date(),
            'type' => $this->faker->randomElement(['annual', 'sick', 'unpaid']),
            'reason' => $this->faker->sentence(),
            'status' => 'pending',
            'approved_by' => null,
            'admin_notes' => null,
        ];
    }
}

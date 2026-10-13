<?php

namespace Database\Factories;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class ActivityLogFactory extends Factory
{
    protected $model = ActivityLog::class;

    public function definition()
    {
        return [
            'auditable_type' => 'App\\Models\\Lead',
            'auditable_id' => 1,
            'user_id' => User::factory(),
            'event' => 'updated',
            'old_values' => [],
            'new_values' => [],
            'ip_address' => $this->faker->ipv4(),
            'user_agent' => $this->faker->userAgent(),
        ];
    }
}

<?php

namespace Database\Factories;

use App\Models\MessageLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<MessageLog>
 */
class MessageLogFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'sender_id' => User::factory(),
            'receiver_id' => User::factory(),
            'body' => $this->faker->sentence(),
            'metadata' => [],
            'read_at' => null,
        ];
    }
}

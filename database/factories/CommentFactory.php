<?php

namespace Database\Factories;

use App\Models\Comment;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class CommentFactory extends Factory
{
    protected $model = Comment::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition()
    {
        return [
            'user_id' => User::factory(),
            'commentable_type' => 'App\\Models\\Lead',
            'commentable_id' => 1,
            'body' => $this->faker->paragraph(),
            'metadata' => [],
        ];
    }
}

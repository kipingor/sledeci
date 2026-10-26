<?php

namespace Database\Factories;

use Sledeci\KenyaPayroll\Models\Employee;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Employee> */
class EmployeeFactory extends Factory
{
    protected $model = Employee::class;

    public function definition(): array
    {
        return [
            'employee_number' => 'EMP-' . fake()->unique()->numerify('#####'),
            'first_name'      => fake()->firstName(),
            'last_name'       => fake()->lastName(),
            'hire_date'       => fake()->dateTimeBetween('-5 years', '-1 month')->format('Y-m-d'),
            'basic_salary'    => fake()->numberBetween(30_000, 150_000),
            'active'          => true,
        ];
    }
}

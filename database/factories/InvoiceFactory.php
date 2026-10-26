<?php

namespace Database\Factories;

use Sledeci\Accounting\Models\Invoice;
use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;
use Carbon\Carbon;

/**
 * BUG FIX — Invoice line items used the key 'total' for the per-line amount,
 * but the Invoice model, InvoiceController (store/update), and the frontend
 * TypeScript interface (InvoiceShow) all expect the key 'amount'.
 *
 * When seed data was loaded, every invoice line rendered as NaN/undefined in
 * the show page table even after the double-encoding bug was resolved.
 *
 * Changed: 'total' => $lineTotal  →  'amount' => $lineTotal
 */
class InvoiceFactory extends Factory
{
    protected $model = Invoice::class;

    public function definition(): array
    {
        $issueDate = $this->faker->dateTimeBetween('-3 months', 'now');
        $dueDate   = (clone $issueDate)->modify('+' . rand(7, 45) . ' days');

        $statuses = ['draft', 'issued', 'paid', 'overdue', 'cancelled'];

        $project  = Project::inRandomOrder()->first();
        $clientId = $project?->client_id ?? User::inRandomOrder()->first()?->id ?? User::factory()->create()->id;

        // Build line items — key MUST be 'amount', not 'total'
        $lineCount = rand(1, 5);
        $lines     = [];
        $subtotal  = 0;

        for ($i = 0; $i < $lineCount; $i++) {
            $quantity  = rand(1, 10);
            $unitPrice = $this->faker->randomFloat(2, 50, 3000);
            $lineAmt   = round($quantity * $unitPrice, 2);

            $lines[] = [
                'description' => ucfirst($this->faker->words(rand(2, 4), true)),
                'quantity'    => $quantity,
                'unit_price'  => $unitPrice,
                'amount'      => $lineAmt,   // FIX: was 'total' — frontend expects 'amount'
            ];

            $subtotal += $lineAmt;
        }

        $taxRate = rand(0, 16);   // 0–16% VAT
        $tax     = round($subtotal * $taxRate / 100, 2);
        $total   = round($subtotal + $tax, 2);

        return [
            'project_id' => $project?->id,
            'client_id'  => $clientId,
            'issue_date' => $issueDate,
            'due_date'   => $dueDate,
            'subtotal'   => round($subtotal, 2),
            'tax'        => $tax,
            'total'      => $total,
            'currency'   => 'USD',
            'status'     => $this->faker->randomElement($statuses),
            'lines'      => $lines,   // Eloquent 'array' cast handles json_encode
            'notes'      => $this->faker->optional(0.6)->sentence(),
            'sent_at'    => null,
        ];
    }

    // ── States ────────────────────────────────────────────────────────────────

    public function draft(): static
    {
        return $this->state(fn () => ['status' => 'draft', 'sent_at' => null]);
    }

    public function issued(): static
    {
        return $this->state(fn () => [
            'status'  => 'issued',
            'sent_at' => now()->subDays(rand(1, 14)),
        ]);
    }

    public function paid(): static
    {
        return $this->state(fn () => [
            'status'  => 'paid',
            'sent_at' => now()->subDays(rand(15, 45)),
        ]);
    }

    public function overdue(): static
    {
        return $this->state(function () {
            $issueDate = now()->subDays(rand(45, 90));
            return [
                'status'     => 'overdue',
                'issue_date' => $issueDate,
                'due_date'   => (clone $issueDate)->addDays(rand(7, 30)),
                'sent_at'    => $issueDate->addDays(1),
            ];
        });
    }

    public function cancelled(): static
    {
        return $this->state(fn () => ['status' => 'cancelled']);
    }
}

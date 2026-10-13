<?php

namespace Database\Factories;

use App\Models\Payment;
use App\Models\Invoice;
use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;
use Carbon\Carbon;

class PaymentFactory extends Factory
{
    protected $model = Payment::class;

    /**
     * Schema reference: @2025_11_10_095559_create_accounting_tables.php (55-71)
     * Columns: id, invoice_id, project_id, amount, currency, method, reference, notes, paid_at, received_by, timestamps, softDeletes
     */
    public function definition(): array
    {
        // Choose an invoice or create one
        $invoice = Invoice::inRandomOrder()->first() ?? Invoice::factory()->create();

        // Invoice may be lacking total, fallback to plausible
        $max = $invoice->total ?? $invoice->amount ?? 1000;
        $min = max(1, $max * 0.2);

        // Pick a related project if possible (nullable in schema)
        $projectId = $invoice->project_id ?? Project::inRandomOrder()->first()?->id;

        // Pick a plausible user to be receiver, or leave null (nullable in schema)
        $receivedBy = User::inRandomOrder()->first()?->id;

        // Pick past date for payment within reason
        $issueAt = $invoice->issue_date ?? $invoice->created_at ?? now()->subDays(14);
        $paidAt = $this->faker->dateTimeBetween($issueAt, 'now');

        return [
            'invoice_id'   => $invoice->id,
            'project_id'   => $projectId,
            'amount'       => $this->faker->randomFloat(2, $min, $max),
            'currency'     => $invoice->currency ?? 'USD',
            'method'       => $this->faker->randomElement(['bank', 'mpesa', 'cash', 'cheque', 'card']),
            'reference'    => Str::upper('TX-' . Str::random(10)),
            'notes'        => $this->faker->sentence(),
            'paid_at'      => $paidAt,
            'received_by'  => $receivedBy,
            'created_at'   => $paidAt,
            'updated_at'   => $paidAt,
        ];
    }

    /**
     * Mark payment as successfully completed (for this schema, use just 'paid_at' presence or convention, since 'status' is not in table)
     */
    public function completed(): Factory
    {
        return $this->state(function (array $attributes) {
            return [
                'paid_at' => $attributes['paid_at'] ?? now(),
            ];
        });
    }

    /**
     * Failed payment (simulate by omitting paid_at and possibly reference/notes)
     */
    public function failed(): Factory
    {
        return $this->state(function () {
            return [
                'paid_at' => null,
                // Optionally: indication in notes
                'notes' => 'Payment failed.',
            ];
        });
    }

    /**
     * Pending payment (simulate by omitting 'paid_at')
     */
    public function pending(): Factory
    {
        return $this->state(function () {
            return [
                'paid_at' => null,
                'notes' => 'Payment pending.',
            ];
        });
    }

    /**
     * A full invoice payment (amount = invoice 'total', mark as completed)
     */
    public function full(): Factory
    {
        return $this->state(function (array $attributes) {
            $invoice = Invoice::find($attributes['invoice_id']) 
                ?? Invoice::inRandomOrder()->first();

            $maxAmount = $invoice?->total ?? $invoice?->amount ?? 0;
            return [
                'amount' => $maxAmount,
                'paid_at' => now(),
            ];
        });
    }
}

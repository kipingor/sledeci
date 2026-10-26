<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Sledeci\Accounting\Jobs\SendPaymentReceiptJob;
use Sledeci\Accounting\Models\Invoice;
use Sledeci\Accounting\Models\Payment;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ManualPaymentTest extends TestCase
{
    use RefreshDatabase;

    private User $accountant;

    private Invoice $invoice;

    protected function setUp(): void
    {
        parent::setUp();

        Queue::fake();

        $this->accountant = User::factory()->create();
        $this->accountant->assignRole(Role::findOrCreate('accountant', 'web'));

        $this->invoice = Invoice::factory()->create(['number' => 'INV-MAN-1', 'total' => 1000, 'status' => 'issued', 'currency' => 'KES']);
    }

    private function pay(array $overrides = [])
    {
        return $this->actingAs($this->accountant)->post("/invoices/{$this->invoice->id}/payment", array_merge([
            'amount' => 1000,
            'channel' => 'cash',
            'paid_at' => now()->toDateString(),
        ], $overrides));
    }

    public function test_cash_payment_without_a_mobile_money_code_is_recorded(): void
    {
        $this->pay()->assertSessionHasNoErrors()->assertRedirect();

        $payment = Payment::firstOrFail();
        $this->assertSame('cash', $payment->channel);          // channel was previously dropped -> 'bank'
        $this->assertSame('pending', $payment->reconciliation_status);
        $this->assertSame('paid', $this->invoice->fresh()->status);
    }

    public function test_receipt_is_queued_not_sent_inline(): void
    {
        $this->pay();

        Queue::assertPushed(SendPaymentReceiptJob::class);
    }

    public function test_mobile_money_payment_keeps_its_channel_and_is_marked_matched(): void
    {
        $this->pay(['channel' => 'mpesa', 'mobile_money_code' => 'RCP001', 'amount' => 400]);

        $payment = Payment::firstOrFail();
        $this->assertSame('mpesa', $payment->channel);
        $this->assertSame('matched', $payment->reconciliation_status);
        $this->assertSame('issued', $this->invoice->fresh()->status); // partial payment
    }

    public function test_duplicate_receipt_code_is_a_validation_error_not_a_500(): void
    {
        $this->pay(['channel' => 'mpesa', 'mobile_money_code' => 'RCP002', 'amount' => 100]);

        $this->pay(['channel' => 'mpesa', 'mobile_money_code' => 'RCP002', 'amount' => 100])
            ->assertSessionHasErrors('mobile_money_code');

        $this->assertSame(1, Payment::count());
    }

    public function test_a_sales_user_cannot_record_payments(): void
    {
        $sales = User::factory()->create();
        $sales->assignRole(Role::findOrCreate('sales', 'web'));

        $this->actingAs($sales)->post("/invoices/{$this->invoice->id}/payment", [
            'amount' => 1000, 'channel' => 'cash', 'paid_at' => now()->toDateString(),
        ])->assertForbidden();

        $this->assertSame(0, Payment::count());
    }
}

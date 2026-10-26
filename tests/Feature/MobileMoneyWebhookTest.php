<?php

namespace Tests\Feature;

use App\Models\MobileMoneyRequest;
use App\Services\MobileMoney\MobileMoneyService;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Sledeci\Accounting\Models\Invoice;
use Sledeci\Accounting\Models\Payment;
use Tests\TestCase;

class MobileMoneyWebhookTest extends TestCase
{
    use RefreshDatabase;

    private Invoice $invoice;

    private MobileMoneyRequest $pending;

    protected function setUp(): void
    {
        parent::setUp();

        Queue::fake();
        config(['services.webhooks.secret' => 'test-secret']);

        $this->invoice = Invoice::factory()->create([
            'number' => 'INV-WH-1', 'total' => 1000, 'status' => 'issued', 'currency' => 'KES',
        ]);

        $this->pending = MobileMoneyRequest::create([
            'invoice_id' => $this->invoice->id,
            'channel' => 'mpesa',
            'external_id' => 'ws_CO_123',
            'amount' => 1000,
            'status' => 'pending',
        ]);
    }

    private function stkPayload(string $checkoutId = 'ws_CO_123', int $code = 0, string $receipt = 'QWE123RTY'): array
    {
        return ['Body' => ['stkCallback' => [
            'MerchantRequestID' => 'm-1',
            'CheckoutRequestID' => $checkoutId,
            'ResultCode' => $code,
            'CallbackMetadata' => ['Item' => [
                ['Name' => 'Amount', 'Value' => 1000],
                ['Name' => 'MpesaReceiptNumber', 'Value' => $receipt],
                ['Name' => 'PhoneNumber', 'Value' => 254700000000],
            ]],
        ]]];
    }

    public function test_callback_without_token_is_forbidden_not_419(): void
    {
        $this->postJson('/webhooks/mpesa/stk-callback', $this->stkPayload())->assertForbidden();
    }

    public function test_callback_with_wrong_token_is_forbidden(): void
    {
        $this->postJson('/webhooks/mpesa/stk-callback?token=nope', $this->stkPayload())->assertForbidden();
    }

    public function test_genuine_stk_callback_records_payment(): void
    {
        $this->postJson('/webhooks/mpesa/stk-callback?token=test-secret', $this->stkPayload())
            ->assertOk()->assertJson(['ResultCode' => 0]);

        $this->assertSame(1, Payment::where('mobile_money_code', 'QWE123RTY')->count());
        // Regression: 'channel' was not fillable, so M-Pesa payments were stored as the default 'bank'
        // and never showed on the financial dashboard (which filters on mobile-money channels).
        $this->assertSame('mpesa', Payment::where('mobile_money_code', 'QWE123RTY')->value('channel'));
        $this->assertSame('completed', $this->pending->fresh()->status);
        $this->assertSame('paid', $this->invoice->fresh()->status);
    }

    public function test_forged_callback_for_unknown_checkout_id_is_ignored(): void
    {
        $this->postJson('/webhooks/mpesa/stk-callback?token=test-secret', $this->stkPayload('ws_CO_FORGED', 0, 'FAKE999'))
            ->assertOk();

        $this->assertSame(0, Payment::count());
        $this->assertSame('issued', $this->invoice->fresh()->status);
    }

    public function test_duplicate_delivery_is_idempotent(): void
    {
        $url = '/webhooks/mpesa/stk-callback?token=test-secret';
        $this->postJson($url, $this->stkPayload());
        $this->postJson($url, $this->stkPayload());

        $this->assertSame(1, Payment::count());
    }

    public function test_customer_cancel_marks_request_failed(): void
    {
        $this->postJson('/webhooks/mpesa/stk-callback?token=test-secret', $this->stkPayload('ws_CO_123', 1032))->assertOk();

        $this->assertSame('failed', $this->pending->fresh()->status);
        $this->assertSame(0, Payment::count());
    }

    public function test_unauthenticated_mtn_callback_cannot_create_payment(): void
    {
        $this->postJson('/webhooks/mtn/callback', [
            'status' => 'SUCCESSFUL', 'externalId' => 'INV-WH-1', 'amount' => 1000, 'financialTransactionId' => 'X1',
        ])->assertForbidden();

        $this->assertSame(0, Payment::count());
    }

    public function test_pos_callback_returns_json_instead_of_500(): void
    {
        $this->postJson('/webhooks/mpesa/pos-callback?token=test-secret', $this->stkPayload('unknown'))
            ->assertOk()->assertJson(['ResultCode' => 0]);
    }

    public function test_fails_closed_in_production_without_secret(): void
    {
        config(['services.webhooks.secret' => null]);
        $this->app['env'] = 'production';

        $this->postJson('/webhooks/mpesa/stk-callback', $this->stkPayload())->assertStatus(503);
    }

    public function test_database_rejects_a_second_payment_with_the_same_receipt_code(): void
    {
        $service = app(MobileMoneyService::class);
        $data = ['channel' => 'mpesa', 'amount' => 500, 'mobile_money_code' => 'DUP123', 'reference' => 'DUP123'];

        $first = $service->recordMobilePayment($this->invoice, $data);
        $second = $service->recordMobilePayment($this->invoice, $data);

        $this->assertSame($first->id, $second->id);
        $this->assertSame(1, Payment::where('mobile_money_code', 'DUP123')->count());

        // Bypass the service guard: the unique index itself must stop a raw duplicate.
        $this->expectException(UniqueConstraintViolationException::class);
        DB::table('payments')->insert(
            ['invoice_id' => $this->invoice->id, 'amount' => 500, 'currency' => 'KES', 'method' => 'mpesa', 'channel' => 'mpesa',
                'mobile_money_code' => 'DUP123', 'paid_at' => now(), 'created_at' => now(), 'updated_at' => now()]
        );
    }
}

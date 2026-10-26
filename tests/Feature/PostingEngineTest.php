<?php

namespace Tests\Feature;

use Sledeci\Accounting\Models\ExchangeRate;
use Sledeci\Accounting\Models\Invoice;
use Sledeci\Accounting\Models\JournalEntry;
use Sledeci\Accounting\Models\Payment;
use App\Models\User;
use Sledeci\Accounting\Services\PostingEngine;
use Database\Seeders\ChartOfAccountsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The ledger invariants: every posted entry balances, partial payments settle
 * the right amount of receivable, and a missing exchange rate is never guessed.
 */
class PostingEngineTest extends TestCase
{
    use RefreshDatabase;

    private PostingEngine $engine;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(ChartOfAccountsSeeder::class);
        $this->actingAs(User::factory()->create());
        $this->engine = app(PostingEngine::class);
    }

    private function invoice(float $subtotal = 1000, float $tax = 0, string $currency = 'KES'): Invoice
    {
        return Invoice::factory()->create([
            'issue_date' => '2026-03-10', 'currency' => $currency, 'status' => 'issued',
            'subtotal' => $subtotal, 'tax' => $tax, 'total' => $subtotal + $tax,
        ]);
    }

    private function payment(Invoice $invoice, float $amount, string $paidAt = '2026-03-20'): Payment
    {
        return Payment::create([
            'invoice_id' => $invoice->id, 'amount' => $amount, 'currency' => $invoice->currency,
            'method' => 'bank', 'channel' => 'bank', 'paid_at' => $paidAt,
        ]);
    }

    private function assertBalanced(JournalEntry $je): void
    {
        $this->assertEqualsWithDelta($je->totalDebits(), $je->totalCredits(), 0.005, 'Journal entry does not balance');
        $this->assertSame('posted', $je->status);
    }

    public function test_functional_currency_invoice_posts_a_balanced_entry_with_vat(): void
    {
        $inv = $this->invoice(1000, 160);

        $je = $this->engine->postInvoice($inv);

        $this->assertBalanced($je);
        $this->assertEqualsWithDelta(1160, $je->totalDebits(), 0.005);
        $this->assertSame('posted', $inv->fresh()->posting_status);
    }

    public function test_an_invoice_cannot_be_posted_twice(): void
    {
        $inv = $this->invoice();
        $this->engine->postInvoice($inv);

        $this->expectException(\RuntimeException::class);
        $this->engine->postInvoice($inv->fresh());
    }

    public function test_full_payment_posts_a_balanced_entry(): void
    {
        $inv = $this->invoice(1000, 0);
        $this->engine->postInvoice($inv);

        $je = $this->engine->postPayment($this->payment($inv->fresh(), 1000));

        $this->assertBalanced($je);
    }

    public function test_partial_payment_posts_a_balanced_entry_and_settles_only_what_was_paid(): void
    {
        $inv = $this->invoice(1000, 0);
        $this->engine->postInvoice($inv);

        $je = $this->engine->postPayment($this->payment($inv->fresh(), 400));

        $this->assertBalanced($je);
        $this->assertEqualsWithDelta(400, $je->totalDebits(), 0.005);   // not a phantom 600 "FX loss"
        $this->assertCount(2, $je->lines);                               // Dr Bank / Cr AR only
    }

    public function test_foreign_currency_invoice_uses_the_rate_on_file(): void
    {
        ExchangeRate::create(['from_currency' => 'USD', 'to_currency' => 'KES', 'rate' => 130, 'rate_type' => 'spot', 'rate_date' => '2026-03-01']);
        $inv = $this->invoice(1000, 0, 'USD');

        $je = $this->engine->postInvoice($inv);

        $this->assertBalanced($je);
        $this->assertEqualsWithDelta(130_000, $je->totalDebits(), 0.01);
    }

    public function test_missing_exchange_rate_is_an_error_not_a_one_to_one_guess(): void
    {
        $inv = $this->invoice(10_000, 0, 'USD');

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('No exchange rate');
        $this->engine->postInvoice($inv);
    }

    public function test_foreign_currency_payment_at_a_higher_rate_books_an_fx_gain_and_balances(): void
    {
        ExchangeRate::create(['from_currency' => 'USD', 'to_currency' => 'KES', 'rate' => 130, 'rate_type' => 'spot', 'rate_date' => '2026-03-01']);
        ExchangeRate::create(['from_currency' => 'USD', 'to_currency' => 'KES', 'rate' => 135, 'rate_type' => 'spot', 'rate_date' => '2026-03-15']);
        $inv = $this->invoice(1000, 0, 'USD');
        $this->engine->postInvoice($inv);

        $je = $this->engine->postPayment($this->payment($inv->fresh(), 1000, '2026-03-20'));

        $this->assertBalanced($je);
        // Bank 135,000 = AR released 130,000 + FX gain 5,000
        $gain = $je->lines->firstWhere(fn ($l) => $l->type === 'credit' && str_contains($l->description, 'gain'));
        $this->assertNotNull($gain);
        $this->assertEqualsWithDelta(5_000, (float) $gain->amount, 0.01);
    }

    public function test_foreign_currency_partial_payment_at_a_lower_rate_books_a_proportional_fx_loss(): void
    {
        ExchangeRate::create(['from_currency' => 'USD', 'to_currency' => 'KES', 'rate' => 130, 'rate_type' => 'spot', 'rate_date' => '2026-03-01']);
        ExchangeRate::create(['from_currency' => 'USD', 'to_currency' => 'KES', 'rate' => 126, 'rate_type' => 'spot', 'rate_date' => '2026-03-15']);
        $inv = $this->invoice(1000, 0, 'USD');
        $this->engine->postInvoice($inv);

        $je = $this->engine->postPayment($this->payment($inv->fresh(), 250, '2026-03-20'));

        $this->assertBalanced($je);
        // $250 of $1,000: AR released 250 × 130 = 32,500; bank 250 × 126 = 31,500; loss 1,000
        $loss = $je->lines->firstWhere(fn ($l) => $l->type === 'debit' && str_contains($l->description, 'loss'));
        $this->assertNotNull($loss);
        $this->assertEqualsWithDelta(1_000, (float) $loss->amount, 0.01);
    }

    public function test_reversal_swaps_debits_and_credits_and_balances(): void
    {
        $inv = $this->invoice(1000, 160);
        $original = $this->engine->postInvoice($inv);

        $reversal = $this->engine->reverse($original, 'Entered in error');

        $this->assertBalanced($reversal);
        $this->assertEqualsWithDelta($original->totalDebits(), $reversal->totalCredits(), 0.005);
    }
}

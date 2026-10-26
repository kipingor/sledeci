<?php

namespace Sledeci\Accounting\Jobs;

use App\Services\MessagingService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Sledeci\Accounting\Models\Payment;

/**
 * SendPaymentReceiptJob
 *
 * Dispatched after every payment recording (manual or via mobile money webhook).
 * Sends a WhatsApp/SMS receipt to the payer.
 *
 * Queued so that a webhook response is never delayed by the send operation.
 */
class SendPaymentReceiptJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $backoff = 60; // seconds between retries

    public function __construct(private Payment $payment) {}

    public function handle(MessagingService $messaging): void
    {
        try {
            $log = $messaging->sendPaymentReceipt($this->payment);
            Log::info('Payment receipt sent', [
                'payment' => $this->payment->id,
                'channel' => $log->channel,
                'status' => $log->status,
            ]);
        } catch (\Throwable $e) {
            Log::error('Payment receipt send failed', [
                'payment' => $this->payment->id,
                'error' => $e->getMessage(),
            ]);
            $this->fail($e);
        }
    }
}

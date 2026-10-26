<?php

namespace App\Jobs;

use App\Models\Email;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Mail\Message;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * SendEmailJob
 *
 * Dispatched by EmailController::store() when the user submits a compose form
 * with send_now = true. The email record is already persisted with status='queued'
 * before the job is dispatched.
 *
 * On success: status → 'sent', sent_at recorded.
 * On failure after all retries: status → 'failed'.
 *
 * Mail provider is driven by MAIL_MAILER in .env.
 * Recommended: set MAIL_MAILER=resend (see config/mail.php).
 *
 * Usage:
 *   SendEmailJob::dispatch($email);
 *   SendEmailJob::dispatch($email)->delay(now()->addMinutes(5));
 */
class SendEmailJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Number of times to attempt before marking failed.
     */
    public int $tries = 3;

    /**
     * Seconds to wait before retrying after a failure.
     */
    public int $backoff = 60;

    /**
     * Maximum seconds a single attempt may run.
     */
    public int $timeout = 30;

    public function __construct(public readonly Email $email) {}

    public function handle(): void
    {
        // Skip if somehow already sent or failed by another worker
        if (! in_array($this->email->status, ['queued', 'draft'])) {
            return;
        }

        try {
            Mail::raw($this->plainText(), function (Message $msg) {
                $msg->to($this->email->to)
                    ->subject($this->email->subject)
                    ->from(
                        config('mail.from.address'),
                        config('mail.from.name')
                    );

                // Attach HTML body if present
                if ($this->email->body) {
                    $msg->html($this->email->body);
                }

                // Reply-To: the sender's own address so replies go to them
                if ($this->email->from) {
                    $msg->replyTo($this->email->from);
                }
            });

            $this->email->update([
                'status' => 'sent',
                'sent_at' => now(),
            ]);

            Log::info('Email sent', [
                'email_id' => $this->email->id,
                'to' => $this->email->to,
                'subject' => $this->email->subject,
            ]);

        } catch (\Throwable $e) {
            Log::error('SendEmailJob failed', [
                'email_id' => $this->email->id,
                'error' => $e->getMessage(),
                'attempt' => $this->attempts(),
            ]);

            // Mark as failed on final attempt so the UI can surface it
            if ($this->attempts() >= $this->tries) {
                $this->email->update(['status' => 'failed']);
            }

            throw $e; // re-throw so the queue manager handles retry/failure
        }
    }

    public function failed(\Throwable $exception): void
    {
        $this->email->update(['status' => 'failed']);

        Log::error('SendEmailJob permanently failed', [
            'email_id' => $this->email->id,
            'error' => $exception->getMessage(),
        ]);
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    /**
     * Fallback plain-text version of the body (strip HTML tags).
     * Mail::raw() needs a non-empty string even when HTML is used.
     */
    private function plainText(): string
    {
        if ($this->email->body_plain) {
            return $this->email->body_plain;
        }

        return strip_tags($this->email->body ?? $this->email->subject ?? '(no content)');
    }
}

<?php

namespace Sledeci\Accounting\Mail;

use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Sledeci\Accounting\Models\Invoice;

class InvoiceMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly Invoice $invoice,
        public readonly string $message = '',
    ) {}

    public function envelope(): Envelope
    {
        $company = config('company.name');
        $subject = "Invoice {$this->invoice->number} from {$company}";

        return new Envelope(
            subject: $subject,
            replyTo: [config('company.email')],
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.invoice',
            with: [
                'invoice' => $this->invoice,
                'company' => config('company'),
                'message' => $this->message,
            ],
        );
    }

    public function attachments(): array
    {
        // Generate the invoice PDF in memory and attach it
        $pdf = Pdf::loadView('pdf.invoice', [
            'invoice' => $this->invoice,
            'company' => config('company'),
        ])->setPaper('a4', 'portrait');

        return [
            Attachment::fromData(
                fn () => $pdf->output(),
                "{$this->invoice->number}.pdf"
            )->withMime('application/pdf'),
        ];
    }
}

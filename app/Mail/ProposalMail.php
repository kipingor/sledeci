<?php

namespace App\Mail;

use App\Models\Proposal;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ProposalMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly Proposal $proposal,
        public readonly string $message = '',
    ) {}

    public function envelope(): Envelope
    {
        $company = config('company.name');
        $subject = "Proposal: {$this->proposal->title} — {$company}";

        return new Envelope(
            subject: $subject,
            replyTo: [config('company.email')],
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.proposal',
            with: [
                'proposal' => $this->proposal,
                'company' => config('company'),
                'message' => $this->message,
            ],
        );
    }

    public function attachments(): array
    {
        $pdf = Pdf::loadView('pdf.proposal', [
            'proposal' => $this->proposal,
            'company' => config('company'),
        ])->setPaper('a4', 'portrait');

        $filename = 'Proposal-'.str($this->proposal->title)->slug().'.pdf';

        return [
            Attachment::fromData(
                fn () => $pdf->output(),
                $filename
            )->withMime('application/pdf'),
        ];
    }
}

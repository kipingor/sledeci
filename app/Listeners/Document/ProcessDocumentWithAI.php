<?php

namespace App\Listeners\Document;

use App\Events\LeadDocumentUploaded;
use App\Jobs\ProcessLeadDocument;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;

class ProcessDocumentWithAI implements ShouldQueue
{
    /**
     * Create the event listener.
     */
    public function __construct()
    {
        //
    }

    /**
     * Handle the event.
     */
    public function handle(LeadDocumentUploaded $event): void
    {
        // Dispatch job to process document
        ProcessLeadDocument::dispatch($event->document->id)
            ->delay(now()->addSeconds(5));
    }
}

<?php

namespace App\Listeners\Document;

use Illuminate\Contracts\Queue\ShouldQueue;

class ExtractDocumentMetadata implements ShouldQueue
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
    public function handle(object $event): void
    {
        //
    }
}

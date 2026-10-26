<?php

namespace App\Listeners\Lead;

use Illuminate\Contracts\Queue\ShouldQueue;

class SendLeadCreatedNotification implements ShouldQueue
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

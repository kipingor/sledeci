<?php

namespace App\Providers;

use Illuminate\Foundation\Support\Providers\EventServiceProvider as ServiceProvider;
use App\Events\LeadCreated;
use App\Events\LeadUpdated;
use App\Events\LeadDeleted;
use App\Events\LeadMoved;
use App\Events\LeadStatusChanged;
use App\Events\LeadDocumentUploaded;
use App\Listeners\Lead\LogLeadActivity;
use App\Listeners\Dashboard\InvalidateDashboardCache;
use App\Listeners\Lead\UpdateLeadMetrics;
use App\Listeners\Lead\SendLeadNotification;
use App\Listeners\Lead\ProcessLeadWithAI;
use App\Listeners\Document\ProcessDocumentWithAI;

class EventServiceProvider extends ServiceProvider
{
    protected $listen = [
        LeadCreated::class => [
            LogLeadActivity::class . '@handleCreated',
            UpdateLeadMetrics::class . '@handleCreated',
            SendLeadNotification::class . '@handleCreated',
            ProcessLeadWithAI::class,
            InvalidateDashboardCache::class,
        ],
        
        LeadUpdated::class => [
            LogLeadActivity::class . '@handleUpdated',
            SendLeadNotification::class . '@handleUpdated',
            InvalidateDashboardCache::class,
        ],
        
        LeadDeleted::class => [
            LogLeadActivity::class . '@handleDeleted',
            InvalidateDashboardCache::class,
        ],
        
        LeadStatusChanged::class => [
            UpdateLeadMetrics::class . '@handleStatusChanged',
            InvalidateDashboardCache::class,
        ],
        
        LeadDocumentUploaded::class => [
            ProcessDocumentWithAI::class,
            InvalidateDashboardCache::class,
        ],
    ];

    /**
     * Bootstrap services.
     */
    public function boot(): void
    {
        //
    }

    /**
     * Determine if events and listeners should be automatically discovered.
     */
    public function shouldDiscoverEvents(): bool
    {
        return false;
    }
}

<?php

namespace Sledeci\Clients;

use Sledeci\Clients\Models\ClientFollowUp;
use Sledeci\Clients\Models\ClientReport;
use Sledeci\Clients\Policies\ClientFollowUpPolicy;
use Sledeci\Clients\Policies\ClientReportPolicy;
use Sledeci\Core\Modules\Module;
use Sledeci\Core\Support\ModuleServiceProvider;

class ClientsServiceProvider extends ModuleServiceProvider
{
    public function register(): void
    {
        parent::register();

        $this->mergeConfigFrom($this->packagePath('config/clients.php'), 'clients');
    }

    protected function module(): Module
    {
        return new Module(
            key: 'clients',
            label: 'Clients',
            // Route-name modules served by this package (see config/access.php).
            routeModules: ['clients', 'follow-ups', 'client-reports'],
            // Used only when the host config/access.php does not define these keys.
            roles: ['sales', 'manager', 'viewer', 'auditor', 'project manager', 'accountant', 'finance'],
            navigation: [
                ['title' => 'Clients', 'href' => '/clients', 'icon' => 'Building2'],
                ['title' => 'Follow-ups', 'href' => '/follow-ups', 'icon' => 'CalendarClock'],
                ['title' => 'Client reports', 'href' => '/client-reports', 'icon' => 'FileBarChart'],
            ],
        );
    }

    protected function policies(): array
    {
        return [
            ClientFollowUp::class => ClientFollowUpPolicy::class,
            ClientReport::class => ClientReportPolicy::class,
        ];
    }

    public function boot(): void
    {
        parent::boot();

        $this->publishes([
            $this->packagePath('config/clients.php') => config_path('clients.php'),
        ], 'sledeci-clients-config');
    }
}

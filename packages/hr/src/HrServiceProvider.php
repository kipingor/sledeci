<?php

namespace Sledeci\Hr;

use Sledeci\Core\Modules\Module;
use Sledeci\Core\Support\ModuleServiceProvider;
use Sledeci\Hr\Models\HrLeaveRequest;
use Sledeci\Hr\Policies\HrLeaveRequestPolicy;

/**
 * Staff directory and leave. The recruitment screens (job postings, applications,
 * LinkedIn) are still in the host application and share the "hr" access module.
 */
class HrServiceProvider extends ModuleServiceProvider
{
    public function register(): void
    {
        parent::register();
        $this->mergeConfigFrom($this->packagePath('config/hr.php'), 'hr');
    }

    protected function module(): Module
    {
        return new Module(
            key: 'hr',
            label: 'HR',
            // Route-name modules served by this package (see config/access.php).
            routeModules: ['hr'],
            // Used only when the host config/access.php does not define "hr".
            roles: ['human resource', 'manager', 'auditor'],
            navigation: [
                ['title' => 'Human Resources', 'href' => '/hr', 'icon' => 'Users'],
                ['title' => 'Leave', 'href' => '/hr/leave', 'icon' => 'CalendarDays'],
            ],
        );
    }

    protected function policies(): array
    {
        return [HrLeaveRequest::class => HrLeaveRequestPolicy::class];
    }
}

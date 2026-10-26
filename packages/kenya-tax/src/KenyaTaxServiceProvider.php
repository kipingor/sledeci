<?php

namespace Sledeci\KenyaTax;

use Sledeci\Core\Modules\Module;
use Sledeci\Core\Support\ModuleServiceProvider;

/**
 * KRA eTIMS. Depends on the accounting package (it submits its invoices).
 * Authorization for submitting an invoice is the `submitToEtims` ability on
 * accounting's InvoicePolicy.
 */
class KenyaTaxServiceProvider extends ModuleServiceProvider
{
    protected function module(): Module
    {
        return new Module(
            key: 'kenya-tax',
            label: 'Kenya tax (eTIMS)',
            // Route-name modules served by this package (see config/access.php).
            routeModules: ['etims'],
            // Used only when the host config/access.php does not define "etims".
            roles: ['accountant', 'finance'],
        );
    }
}

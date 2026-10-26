<?php

use App\Providers\AppServiceProvider;
use App\Providers\EventServiceProvider;
use App\Providers\FortifyServiceProvider;
use Sledeci\Accounting\AccountingServiceProvider;
use Sledeci\Clients\ClientsServiceProvider;
use Sledeci\Core\CoreServiceProvider;
use Sledeci\Hr\HrServiceProvider;
use Sledeci\KenyaPayments\KenyaPaymentsServiceProvider;
use Sledeci\KenyaPayroll\KenyaPayrollServiceProvider;
use Sledeci\KenyaTax\KenyaTaxServiceProvider;

return [
    AppServiceProvider::class,
    EventServiceProvider::class,
    FortifyServiceProvider::class,

    // Sledeci module packages (monorepo). When a package is split into its own
    // repository and installed with Composer, delete its line here: Laravel
    // package discovery registers it automatically.
    CoreServiceProvider::class,
    ClientsServiceProvider::class,
    AccountingServiceProvider::class,
    KenyaTaxServiceProvider::class,
    KenyaPaymentsServiceProvider::class,
    HrServiceProvider::class,
    KenyaPayrollServiceProvider::class,
];

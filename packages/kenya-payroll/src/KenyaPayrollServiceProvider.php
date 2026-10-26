<?php

namespace Sledeci\KenyaPayroll;

use Sledeci\Core\Modules\Module;
use Sledeci\Core\Support\ModuleServiceProvider;
use Sledeci\KenyaPayroll\Models\Employee;
use Sledeci\KenyaPayroll\Models\PayrollRun;
use Sledeci\KenyaPayroll\Models\Payslip;
use Sledeci\KenyaPayroll\Models\PayslipDeduction;
use Sledeci\KenyaPayroll\Policies\EmployeePolicy;
use Sledeci\KenyaPayroll\Policies\PayrollRunPolicy;
use Sledeci\KenyaPayroll\Policies\PayslipDeductionPolicy;
use Sledeci\KenyaPayroll\Policies\PayslipPolicy;

/**
 * Statutory rates (PAYE bands, SHIF, NSSF, Housing Levy, HELB) are still constants in
 * KenyaPayrollService. They change, so moving them into effective-dated configuration
 * is the first thing to do before relying on this for filing.
 */
class KenyaPayrollServiceProvider extends ModuleServiceProvider
{
    protected function module(): Module
    {
        return new Module(
            key: 'kenya-payroll',
            label: 'Payroll',
            // Route-name modules served by this package (see config/access.php).
            routeModules: ['payroll'],
            // Used only when the host config/access.php does not define "payroll".
            roles: ['human resource', 'finance', 'accountant', 'auditor'],
            navigation: [
                ['title' => 'Payroll', 'href' => '/payroll', 'icon' => 'Landmark'],
            ],
        );
    }

    protected function policies(): array
    {
        return [
            Employee::class => EmployeePolicy::class,
            PayrollRun::class => PayrollRunPolicy::class,
            Payslip::class => PayslipPolicy::class,
            PayslipDeduction::class => PayslipDeductionPolicy::class,
        ];
    }
}

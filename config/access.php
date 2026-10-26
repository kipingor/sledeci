<?php

/*
|--------------------------------------------------------------------------
| Module access map
|--------------------------------------------------------------------------
| Enforced by App\Http\Middleware\EnforceModuleAccess for every authenticated
| web and API route. The module is the first segment of the route name after
| the "web." / "api." prefix (e.g. "web.payroll.index" => "payroll").
|
|  - 'admin' always has access to everything.
|  - A user with NO role is denied everywhere except the 'open' modules, so a
|    self-registered account sees nothing until an admin assigns a role.
|  - Modules not listed below require ANY role (safe default).
|  - Roles in 'read_only_roles' may only use GET/HEAD/OPTIONS requests.
|
| Role names MUST match database/seeders/RoleSeeder.php.
*/

$crm = ['sales', 'manager', 'viewer', 'auditor'];
$projects = ['project manager', 'manager', 'viewer', 'auditor'];
$ledger = ['accountant', 'finance', 'auditor'];                       // books of account
$billing = ['accountant', 'finance', 'manager', 'auditor'];            // invoices / payments / expenses
$supply = ['manager', 'accountant', 'finance', 'auditor', 'viewer'];

return [

    'admin_role' => 'admin',

    'read_only_roles' => ['viewer', 'auditor'],

    // Modules any authenticated user may reach (even with no role)
    'open' => ['dashboard'],

    'modules' => [
        // ── CRM & sales ──────────────────────────────────────────────
        'leads' => $crm,
        'lead-documents' => $crm,
        'pipelines' => $crm,
        'opportunities' => $crm,
        'contacts' => $crm,
        'follow-ups' => $crm,
        'client-reports' => $crm,
        'client-report-metrics' => $crm,
        'emails' => [...$crm, 'project manager'],
        'conversations' => [...$crm, 'project manager'],
        'proposals' => $crm,
        'questions' => $crm,
        'ai' => $crm,
        'documents' => $crm,
        'upload' => $crm,
        'import-export' => ['sales', 'manager'],
        'automation-rules' => ['manager'],
        'workflows' => ['manager'],
        'automation-logs' => ['manager', 'auditor'],
        'clients' => [...$crm, 'project manager', 'accountant', 'finance'],
        'rfps' => [...$crm, 'project manager'],
        'tenders' => [...$crm, 'project manager'],
        'approvals' => ['sales', 'manager', 'project manager', 'accountant', 'finance'],

        // ── Projects ─────────────────────────────────────────────────
        'projects' => $projects,
        'project-templates' => $projects,
        'milestones' => $projects,
        'tasks' => [...$projects, 'field agent'],
        'time-logs' => [...$projects, 'field agent', 'human resource'],

        // ── Accounting ───────────────────────────────────────────────
        'accounting' => $ledger,
        'chart-of-accounts' => $ledger,
        'accounting-periods' => $ledger,
        'journal-entries' => $ledger,
        'accounting-reports' => $ledger,
        'exchange-rates' => $ledger,
        'forex-rates' => $billing,
        'invoices' => $billing,
        'payments' => $billing,
        'expenses' => $billing,
        'etims' => ['accountant', 'finance'],
        'financing' => ['accountant', 'finance', 'manager', 'auditor'],
        'trade-documents' => [...$billing, 'sales'],

        // ── Supply chain & retail ────────────────────────────────────
        'inventory' => $supply,
        'products' => [...$supply, 'sales'],
        'suppliers' => $supply,
        'vendors' => $supply,
        'purchase-orders' => $supply,
        'deliveries' => [...$supply, 'field agent'],
        'delivery-documents' => [...$supply, 'field agent'],
        'pos' => ['sales', 'manager', 'accountant', 'finance'],

        // ── People ───────────────────────────────────────────────────
        'hr' => ['human resource', 'manager', 'auditor'],
        'payroll' => ['human resource', 'finance', 'accountant', 'auditor'],
        'sacco' => ['finance', 'accountant', 'manager', 'auditor'],
        'field-agents' => ['field agent', 'manager', 'sales', 'project manager', 'auditor'],
        'users' => ['human resource'],

        // ── Insight ──────────────────────────────────────────────────
        'analytics' => ['manager', 'sales', 'project manager', 'finance', 'accountant', 'auditor', 'viewer'],
        'reports' => ['manager', 'sales', 'project manager', 'finance', 'accountant', 'auditor', 'viewer'],
        'activities' => null,   // any role
        'audit-logs' => ['auditor'],
    ],
];

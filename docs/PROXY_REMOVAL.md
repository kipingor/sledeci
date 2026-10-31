# Transition proxies — removed

As of 2026-10-29 the thin `App\Models\*` / `App\Policies\*` proxies for package-owned
entities have been **deleted**.

Canonical classes live only under:

- `Sledeci\Accounting\Models\*`
- `Sledeci\Clients\Models\*`
- `Sledeci\Hr\Models\*`
- `Sledeci\KenyaPayroll\Models\*`

Policies are registered by each package’s service provider via `Gate::policy()`.

Host models that remain in `App\Models` (and should stay there) include:
`User`, `Project`, `Lead`, `CompanySetting`, `Workflow`, etc.

Related models used *by* packages are configured, not hard-coded:

- `config('accounting.user_model')` / `project_model` / `client_model`
- `config('clients.*')`, `config('hr.user_model')`, `config('kenya-payroll.user_model')`
- `config('kenya-tax.company_setting_model')`

If you reintroduce an `App\Models\Invoice` class by mistake, package tests
(`ModelOwnershipTest`) will fail.

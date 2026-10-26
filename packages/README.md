# Sledeci packages (monorepo)

Each directory here is a Composer package that is developed inside this application and can later be split
into its own repository and published on Packagist.

| Package | Namespace | Provides |
|---|---|---|
| `core` | `Sledeci\Core` | Module registry, `ModuleServiceProvider` base class, role-based policy trait, shared contracts, base controller |
| `clients` | `Sledeci\Clients` | Clients, follow-ups, client reports (requires `accounting`) |
| `accounting` | `Sledeci\Accounting` | Chart of accounts, journals, invoices, payments, expenses, statements, forex, financing |
| `kenya-tax` | `Sledeci\KenyaTax` | KRA eTIMS: submit invoices, standard codes, connection test (requires `accounting`) |
| `kenya-payments` | `Sledeci\KenyaPayments` | M-Pesa, Airtel Money, MTN MoMo collections and public webhooks; implements `PaymentGateway` (requires `accounting`) |
| `hr` | `Sledeci\Hr` | Staff directory and leave (recruitment screens are still in the host) |
| `kenya-payroll` | `Sledeci\KenyaPayroll` | Employees, payroll runs (PAYE, SHIF, NSSF, Housing Levy, HELB), payslips, P9 export |

## How packages are loaded today

The root `composer.json` maps each namespace under `autoload.psr-4`, and `bootstrap/providers.php` registers each
provider. Changing `autoload` does not touch `composer.lock`, so no `composer update` is needed, but run
`composer dump-autoload` after pulling.

When a package is split out and installed with `composer require`, delete its autoload line and its line in
`bootstrap/providers.php`; Laravel package discovery (`extra.laravel.providers` in the package's `composer.json`)
takes over.

## Anatomy of a package

```
packages/<name>/
  composer.json                 name, deps, psr-4, extra.laravel.providers
  config/<name>.php             optional, merged by the provider
  database/migrations/          loaded automatically (keep the original timestamps)
  resources/js/pages/           Inertia pages; page names are unchanged ("clients/index")
  routes/web.php                loaded inside the host's web/auth/verified/module.access group, names prefixed "web."
  src/<Name>ServiceProvider.php extends Sledeci\Core\Support\ModuleServiceProvider
  src/{Models,Http,Policies,Services,Jobs,Mail}/
```

A provider only has to implement `module()` (key, label, route modules, default roles, navigation) and,
when it has policies, `policies()` (model => policy). Routes, migrations, policy registration, the module
registry and the Inertia page path are wired by the base class.

## Rules

1. **Dependencies run one way and are declared.** `tests/Feature/Guards/PackageBoundariesTest` holds the allowed
   graph (`core` ← `accounting` ← `clients`, `kenya-tax`, `kenya-payments`; `core` ← `hr`; `core` ← `kenya-payroll`) and fails if a package imports one it has not
   declared, or if `composer.json` disagrees. Where the natural direction would create a cycle, use an interface in
   `Sledeci\Core\Contracts` instead: accounting starts a mobile-money push through `PaymentGateway` (implemented by
   kenya-payments) and shows follow-ups through `PendingFollowUps` (implemented by clients), each with a safe fallback.
2. **Host coupling is tracked, not hidden.** Packages currently still import a few host classes (`App\Models\User`,
   `Project`, `Lead`, `Opportunity`, ...) because those modules are not extracted yet. `tools/verification/README.md`
   explains how to list them; the list should only shrink.
3. **Routes keep their names.** `config/access.php` decides who may use a module from the first segment of the
   route name, and `tests/Fixtures/route-baseline.json` fails the build if a route disappears.
4. **Policies are real.** `tests/Feature/Guards/PolicyStubTest` fails on any deny-all scaffold, in the host and in packages.
5. **Models match migrations.** `tests/Feature/Guards/ModelSchemaTest` fails if a `$fillable` column does not exist.

## Pages

`resources/js/lib/pages.ts` builds the page map for both the browser entry (`app.tsx`) and server rendering
(`ssr.tsx`). A page in `resources/js/pages` overrides a package page with the same name.

## Adding a package

1. Copy `packages/clients` as a starting point (smallest complete example).
2. Move classes with namespaces and references fixed by script rather than by hand; see `tools/verification`.
3. Add the autoload line, the provider line, and a `tests/Feature/Packages/<Name>PackageTest.php`.
4. Update `tests/Fixtures/route-baseline.json` if controller class names changed.

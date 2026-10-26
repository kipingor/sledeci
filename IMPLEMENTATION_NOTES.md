# Implementation notes: route restoration, policies, schema, packages, public site

Date: 21 October 2026. Base: `sledeci-main` as uploaded. Original snapshot used for comparison: `sledeci-orig`.

**Read this first: nothing here has been executed.** PHP, Composer, MySQL and the Vite build were not available
where this work was done. Every change was checked statically (see "How it was verified"), and the first thing to
do is run the commands under "First run" and fix whatever the real runtime finds.

## What was done

| # | Request | Result |
|---|---|---|
| 1 | Re-register the 151 lost routes, grouped per module | Done. `routes/domain/{core,crm,communications,tenders,project-governance,inventory,sacco,field-agents,reports,ai-leads,automation,etims,hiring}.php`, plus accounting and clients inside their packages. A static replica of the route test shows all 351 baseline routes registered. |
| 2 | Is `route()` → Wayfinder needed? | **Yes, and preferred.** Ziggy's route table is never supplied by the backend, so every `route()` call threw. Sledeci already uses Wayfinder and removed Ziggy. Replaced in 4 files; the global typing was removed so misuse now fails `tsc`. |
| 3 | Replace deny-all policies | All 59 replaced. Hand-written record-state rules for Invoice, Payment, ImportJob, Employee, PayrollRun, JournalEntry (plus Payslip, HrLeaveRequest). Ledger-like records are append-only. |
| 4 | Fix schema mismatches | Five, not four (see below). One guarded migration: `2026_10_21_090000_align_model_columns_with_schema.php`. |
| 5 | MySQL for CI and phpunit; three guard tests | `phpunit.xml`, `.github/workflows/tests.yml` (MySQL 8.4 service), `.env.example`. Guards in `tests/Feature/Guards/`. A `TestCase` guard refuses to run against a database whose name lacks "test". |
| 6 | Monorepo layout, core package, contracts | `packages/core`: module registry, `ModuleServiceProvider` base class, policy trait, base controller, 7 contracts, null fallback. |
| 7 | Extract Clients, then Accounting | Both done as packages (`packages/clients`, `packages/accounting`), with every reference rewritten by script. |
| 8 | Welcome, About, Terms, Solutions, Contact, Careers (HR-connected, applications, LinkedIn) | Done. See "Public site and careers". |

## First run

```bash
composer dump-autoload                     # new Sledeci\* namespaces (composer.lock needs no change)
cp .env.example .env && php artisan key:generate
# create the databases first: sledeci and sledeci_test (MySQL / MariaDB)
php artisan migrate --seed
php artisan wayfinder:generate --with-form # creates resources/js/routes and resources/js/actions
npm install --legacy-peer-deps             # plain `npm ci` fails on a peer conflict, see "Known issues"
npm run build
php artisan test                           # needs MySQL; DB_DATABASE must contain "test"
composer lint                              # Pint: new files were written to the Laravel style but never formatted
```

If a test fails, the guard tests name the exact route, column or policy at fault.

## How it was verified (and what that does not prove)

| Check | Result |
|---|---|
| PHP 8.4 syntax of every file (via `@php-wasm/node`) | 0 errors in 892 files (original: 828, 0 errors) |
| Every baseline `Controller@action` is registered (static replica of `RouteBaselineTest`) | 351 / 351 |
| Model `$fillable` vs migrations | 72 models, 0 mismatches (original: 5) |
| `use` imports resolve to a file, including packages | only the 5 pre-existing dead ones remain |
| Unqualified class used without import (checker proven on a seeded error) | 0 in the new tree, 0 in the original |
| No reference to a moved class under its old namespace | 0 |
| `tsc --noEmit` | 59 errors, **all** "cannot find module `@/routes/...` or `@/actions/...`", which only exist after `wayfinder:generate`. 0 other errors |
| Front-end `@/routes/...` named imports match a defined route name | all new imports match |

**Not verified:** that any test passes; migrations on MySQL; Pint formatting; the Vite/Wayfinder build; the exact
export names Wayfinder generates (they follow the existing `l.index()` / `bulkDelete` convention); mail delivery;
the LinkedIn API call; behaviour in a browser.

## Decisions worth knowing

* **Packages load by autoload + provider list, not `composer require`.** Root `composer.json` has the PSR-4 lines and
  `bootstrap/providers.php` lists the providers. Autoload edits do not change `composer.lock`'s content hash.
  Splitting a package out later means deleting those two lines (`packages/README.md`).
* **Package routes register before host routes** (providers boot first). Static-before-wildcard ordering inside each
  route file was kept, and a test pins `/invoices/forex-rates` against `/invoices/{invoice}`.
* **Route names, page names and URLs are unchanged**, so `config/access.php`, the sidebar and the pages keep working.
* **Pages live in packages** and are found by `resources/js/lib/pages.ts` (shared by `app.tsx` and `ssr.tsx`); a host
  page overrides a package page of the same name.
* **Policies follow `config/access.php`** through `Sledeci\Core\Policies\ChecksModuleRoles`, so a policy and the route
  middleware cannot disagree. The admin role passes everything *except* abilities a policy lists in `adminDenied()`
  (for example editing a posted journal or deleting a payment, which are blocked for everyone).
* **Clients ⇄ Accounting** are decoupled through `Sledeci\Core\Contracts\ClientFinancialSummary`. Without accounting,
  clients show no financial data instead of failing. `ClientFollowUp::invoice()` resolves its model from
  `config('clients.invoice_model')`.
* **eTIMS stays in the host** (`routes/domain/etims.php`, `EtimsController`) until a kenya-tax package exists. Its
  authorization changed from `update` to a new `submitToEtims` ability (accountant/finance only, never drafts).
* **MySQL is now the documented database.** Reports use `JSON_EXTRACT` / `DATE_FORMAT`, which SQLite cannot run.

## Defects found and fixed along the way

1. **`Tender.analysis_status` column** was declared on the `rfps` table, not `tenders` (a fifth mismatch beyond the four
   reported; I had wrongly dismissed it earlier as a false positive). Tender creation with a document wrote it.
2. **PhpSpreadsheet 5.10 removed `getCellByColumnAndRow`**; 3 calls in `LeadImportService` / `ProcessLeadImport` would crash.
3. **Bulk lead actions sent `lead_ids`, the controller read `ids`.** `LeadController` now accepts both.
4. **No `csrf-token` meta tag** in `app.blade.php`, so the `fetch` POSTs and the bulk-export form would get 419.
5. **`flash` was never shared** with Inertia, so success/error messages and import results never reached the UI.
   Now shared and shown as toasts by `AppLayout`.
6. **`ProposalController` authorized `viewAny`** but `ProposalPolicy` had no such method (denied for everyone).
7. **`'project-manager'` (hyphen)** in `ProjectPolicy`, `MilestonePolicy`, `TaskPolicy`; the seeded role is `'project manager'`.
8. **`clients/edit` page did not exist** though `ClientController::edit` renders it. Added.
9. **`POST /api/v1/upload`** pointed at a method that does not exist; removed (nothing called it).
10. **`OpenAIClientBindingTest`** could never pass (bare PHPUnit `TestCase`, missing class); now skipped with a reason.
11. **Missing routes the UI already called**: `ai.*` (6, controller existed unrouted), `leads.bulk-import` (new
    `LeadImportController`), `workflows.*` (new `WorkflowController`; the builder component is not mounted on any page yet).

## Public site and careers

* **Pages:** `welcome`, `site/about`, `site/solutions`, `site/terms`, `site/contact`, `careers/index`, `careers/show`
  (with the application form); shared `components/site/public-layout.tsx`. Public routes are in `routes/site.php`
  with names that have no `web.` prefix, so module access never applies.
* **HR connection:** `JobPosting` and `JobApplication` models; HR screens `hr/jobs/*` and `hr/applications` under route
  names `web.hr.*`, so the existing `hr` access rule (human resource, manager; auditor read-only) governs them. Sidebar:
  *HR & Team > Job Postings / Applications*.
* **Applications:** CV upload (PDF/DOC/DOCX ≤ 5 MB) on the private disk, served only to HR; consent checkbox;
  honeypot; throttled (5/min); one application per email per job; source tracked (`careers_page` / `linkedin`);
  HR pipeline (new → screening → interview → offer → hired / rejected), rating and notes.
* **LinkedIn:** `HR > Jobs > LinkedIn` always offers a ready-made post, a copy button and LinkedIn's share window.
  If `LINKEDIN_ACCESS_TOKEN` and `LINKEDIN_AUTHOR_URN` are set, it can also publish through the UGC Posts API. **That
  call has never been run against LinkedIn**; test it with a throwaway post, and expect to refresh the token. Shared links carry
  `?src=linkedin` so applications are attributed.
* **SEO:** each role emits schema.org `JobPosting` JSON-LD.
* **Content you must review before launch:** the Terms & Conditions are a sensible template, **not legal advice**. Have a
  lawyer review them, set `SITE_LEGAL_NAME`, `SITE_GOVERNING_LAW` and `SITE_TERMS_UPDATED`, and add a privacy policy
  (careers collects personal data). The About page is generic copy at the top of `site/about.tsx`. Decide a retention
  period for applications; there is no automatic deletion.
* **Env vars** added to `.env.example`: `SITE_*`, `CONTACT_EMAIL`, `HR_EMAIL`, `LINKEDIN_*`.

## Known issues left unfixed

* `npm ci` fails: `vite` is aliased to `vite-plus-core`, which `@inertiajs/vite` rejects (peer `vite ^7 || ^8`). The repo
  is configured for pnpm but ships only `package-lock.json`. `ziggy-js` is still in `package.json` (no code uses it now);
  run `npm uninstall ziggy-js` with your chosen package manager so the lockfile is refreshed properly.
* `ProposalPolicy` and `SupplierPolicy` check roles `proposal-writer` and `procurement`, which are never seeded.
* Dead code: models `ProjectLessonsLearned`, `ProjectMilestone`, `ProjectTask` have no tables (allow-listed in
  `ModelSchemaTest`); API controllers for Department/Message/Notification import models that do not exist (unrouted);
  `AiOrchestrationServiceTest` is skipped; 152 root-level FormRequest scaffolds are unused; 72 of 79 seeders are stubs;
  20 stray `.php-cs-fixer.dist.php` files and `app/sledeci.lnk`.
* `workflow-builder.tsx` is not used by any page.
* Not extracted yet: Kenya tax / payments / payroll, HR, POS, inventory, SACCO, contacts, tenders, project governance,
  communications, field agents, reports. Packages still import some host classes (`User`, `Project`, `Lead`,
  `Opportunity`, ...); the contracts in `sledeci/core` are the route to removing that.
* Polymorphic type strings stored in the database (`source_type` and similar) now hold the new class names. Fine for a
  fresh install; an existing database would need them rewritten.
* Existing databases created from the previous migration set cannot be upgraded in place (unchanged from before).

## Suggested next steps

1. Run the "First run" block; fix what the real runtime finds. Expect small issues, mainly Wayfinder export names and
   Pint formatting.
2. Extract `kenya-tax` (eTIMS) and `kenya-payments` next: both already depend only on accounting concepts and have contracts waiting
   (`Billable`, `PaymentGateway`).
3. Replace `EloquentClientFinancialSummary`-style direct model use elsewhere (dashboard, POS, SACCO) with
   `LedgerPoster` / `Payable` before extracting those modules.

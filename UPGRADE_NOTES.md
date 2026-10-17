# Laravel 13 upgrade – review & fixes

## Do these after copying the files in
```bash
composer update                      # refreshes composer.lock (new packages + PHP ^8.4)
php artisan cache:clear              # Laravel 13 cache hardening: old serialized models must go
rm -f bootstrap/cache/*.php          # stale package manifest hides new service providers
php artisan migrate                  # 3 new migrations + corrected pivot/audit migrations
npm install && npm run build
```
Set in `.env` (see `.env.example`): `WEBHOOK_SECRET` (payment callbacks return 503 without it),
`ADMIN_USER_EMAIL` / `ADMIN_USER_PASSWORD`, and the AI / mobile-money keys you use.
PHP must be **8.4+** (the lock already contained Symfony 8 / PHPUnit 13).

## Verification performed (scratch install, PHP 8.4, SQLite)
* Pest: 172 passed, 0 failed, 18 skipped (the skips are tests you marked STALE) – was 94 / 67 failed.
  Includes new regression tests: SqlOrderTest, ProjectStakeholderModelTest, ProjectPagesSmokeTest.
* `migrate:fresh` clean (46 migrations), `route:cache` OK, 496 routes (123 API).
* Vitest: 14 passed, 5 skipped.  `npm run build` OK (fonts fetch disabled in the sandbox only).
* Not verifiable here: MySQL specifics, real Reverb/OpenAI/M-Pesa calls, `tsc` strict typing (74 pre-existing type errors remain, none block the build).

## Also fixed
* MySQL-only `FIELD()` ordering (projects, milestones, tenders) replaced by portable `App\Support\SqlOrder`.
* Stakeholder form posted `management_strategy` but the backend validated `engagement_strategy`, so the text was never saved.

## Known gaps NOT changed (need your decision)
* `ziggy-js` `route()` is used in 5 files (ai-lead-insights, bulk-lead-import, workflow-builder,
  use-bulk-lead-operations) for routes that do not exist (`ai.*`, `leads.import`, `workflows.*`) or are
  named `web.*`. Ziggy PHP is not installed. These features never worked as wired.
* `laravel/reverb` is not required in composer.json; add it only if you run websockets.
* Resurrected `ActivityLog` stubs (model/factory/policy/migration) – the code states AuditLog replaced them.
* `routes/domain/leads.php` is not loaded by anything.
* `HandleInertiaRequests`, `LogUserActivity`-in-web-group and the AI client priority (OpenAI > Anthropic > Null)
  are reconstructions – compare with your pre-upgrade git history.

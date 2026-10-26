# Verification tools

Static checks written while extracting the packages, because PHP and the test suite could not be run in that
environment. They need only Python 3 (and Node for the syntax linter). They do **not** replace the test suite;
they catch the failure modes the test suite cannot see until runtime.

Run from the repository root, for example `python3 tools/verification/schema_check.py .`
(`wayfinder_check.py` and `static_checks.py` import `routes_parse.py` from this folder; run them with
`PYTHONPATH=tools/verification`, and edit the hard-coded `sys.path.insert` line if you moved the files).

| Script | Catches |
|---|---|
| `schema_check.py <root>` | Model `$fillable` columns that no migration creates |
| `static_checks.py <root>` | `use` imports that resolve to no file (including packages); route controller methods that do not exist |
| `undefined_refs.py <root> <out.json>` | Unqualified class names used without an import (typical after moving a class between namespaces) |
| `wayfinder_check.py <root>` | Front-end `@/routes/...` named imports that match no defined route name |
| `movetool.py` | Moves PHP classes between namespaces and rewrites every reference; used for the clients and accounting extractions |
| `php-syntax-lint.mjs` | PHP 8.4 syntax check through `@php-wasm/node` (`npm i @php-wasm/node @php-wasm/universal`) |

Known false positives: `static_checks.py` reports `statistics` in `routes/api.php` (those routes are commented
out), and `wayfinder_check.py` lists Fortify/settings routes defined outside the parsed files.

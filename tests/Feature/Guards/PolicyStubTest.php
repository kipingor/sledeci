<?php

namespace Tests\Feature\Guards;

use Tests\TestCase;

/**
 * Guard 3: no policy may be an unimplemented scaffold.
 *
 * `php artisan make:policy --model=X` writes every method as `return false;`.
 * Laravel auto-discovers policies by name, so such a file silently denies the
 * whole model to every user. This test fails if a policy has no ability that
 * can ever return anything but false, or if it points at a model that does not
 * exist.
 */
class PolicyStubTest extends TestCase
{
    /**
     * Policies in the host application and in every module package.
     *
     * @return list<string>
     */
    private function policyFiles(): array
    {
        return array_merge(
            glob(app_path('Policies/*Policy.php')),
            glob(base_path('packages/*/src/Policies/*Policy.php')),
        );
    }

    public function test_no_policy_is_a_deny_all_stub(): void
    {
        $stubs = [];

        foreach ($this->policyFiles() as $file) {
            $source = file_get_contents($file);

            preg_match_all(
                '/public function (?!before\b)(\w+)\([^)]*\)(?::\s*[\w?|\\\\]+)?\s*\{(.*?)\n    \}/s',
                $source,
                $methods,
                PREG_SET_ORDER
            );

            $abilities = array_filter($methods, fn ($m) => $m[1] !== 'forceDelete');

            $allFalse = $abilities !== [] && collect($abilities)
                ->every(fn ($m) => trim(preg_replace('/\s+/', ' ', $m[2])) === 'return false;');

            if ($abilities === [] || $allFalse) {
                $stubs[] = basename($file);
            }
        }

        $this->assertSame([], $stubs, "Deny-all policy stubs found:\n  ".implode("\n  ", $stubs));
    }

    public function test_every_policy_has_a_matching_model(): void
    {
        $orphans = [];

        foreach ($this->policyFiles() as $file) {
            preg_match('/^namespace ([^;]+);/m', file_get_contents($file), $ns);

            $model = preg_replace('/Policy$/', '', basename($file, '.php'));
            $modelClass = str_replace('\\Policies', '\\Models', $ns[1]).'\\'.$model;

            if (! class_exists($modelClass)) {
                $orphans[] = basename($file).' (expected '.$modelClass.')';
            }
        }

        $this->assertSame([], $orphans, "Policies with no model:\n  ".implode("\n  ", $orphans));
    }
}

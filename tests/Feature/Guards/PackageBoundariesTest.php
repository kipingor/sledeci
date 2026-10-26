<?php

namespace Tests\Feature\Guards;

use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;
use Tests\TestCase;

/**
 * Guard 4: packages may only depend on the packages they declare.
 *
 * This is what keeps accounting from importing the mobile-money package again
 * (a dependency cycle) and keeps every package installable on its own.
 * When you add a package, or a dependency, declare it here AND in the package's composer.json.
 */
class PackageBoundariesTest extends TestCase
{
    /** package directory => [namespace segment, allowed dependency namespace segments] */
    private const PACKAGES = [
        'core' => ['Core', []],
        'clients' => ['Clients', ['Core', 'Accounting']],
        'accounting' => ['Accounting', ['Core']],
        'kenya-tax' => ['KenyaTax', ['Core', 'Accounting']],
        'kenya-payments' => ['KenyaPayments', ['Core', 'Accounting']],
        'hr' => ['Hr', ['Core']],
        'kenya-payroll' => ['KenyaPayroll', ['Core']],
    ];

    public function test_every_package_is_declared(): void
    {
        $dirs = array_map('basename', glob(base_path('packages/*'), GLOB_ONLYDIR));

        $this->assertEqualsCanonicalizing(
            array_keys(self::PACKAGES),
            $dirs,
            'Declare every package directory in PackageBoundariesTest::PACKAGES (and its allowed dependencies).'
        );
    }

    public function test_packages_only_use_the_packages_they_declare(): void
    {
        $violations = [];

        foreach (self::PACKAGES as $dir => [$own, $allowed]) {
            foreach ($this->phpFiles(base_path("packages/{$dir}")) as $file) {
                preg_match_all('/Sledeci\\\\(\w+)\\\\/', file_get_contents($file), $found);

                foreach (array_unique($found[1]) as $namespace) {
                    if ($namespace !== $own && ! in_array($namespace, $allowed, true)) {
                        $violations[] = str_replace(base_path().'/', '', $file)." uses Sledeci\\{$namespace}";
                    }
                }
            }
        }

        $this->assertSame([], $violations, "Undeclared package dependencies:\n  ".implode("\n  ", $violations));
    }

    public function test_composer_dependencies_match_the_declared_ones(): void
    {
        foreach (self::PACKAGES as $dir => [, $allowed]) {
            $composer = json_decode(file_get_contents(base_path("packages/{$dir}/composer.json")), true);
            $required = array_keys($composer['require'] ?? []);

            foreach ($allowed as $namespace) {
                $name = 'sledeci/'.strtolower(preg_replace('/(?<!^)([A-Z])/', '-$1', $namespace));

                $this->assertContains($name, $required, "packages/{$dir}/composer.json must require {$name}");
            }
        }
    }

    /**
     * @return \Generator<string>
     */
    private function phpFiles(string $directory): \Generator
    {
        foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator($directory, RecursiveDirectoryIterator::SKIP_DOTS)) as $file) {
            if ($file->getExtension() === 'php') {
                yield $file->getPathname();
            }
        }
    }
}

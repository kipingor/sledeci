<?php

namespace Tests\Feature\Guards;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * Guard 2: every mass-assignable attribute must exist as a column.
 *
 * A model that writes a column the migrations never created fails at runtime
 * with an SQL error (or, for reads, silently returns null). That is how HELB
 * went undeducted from payslips. This test migrates the schema and compares it
 * with each model's $fillable.
 */
class ModelSchemaTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Dead models that have no table (see the readiness report, finding F-09).
     * Do not add to this list: fix the model or the migration instead.
     */
    private const KNOWN_UNMAPPED = [
        'ProjectLessonsLearned',
        'ProjectMilestone',
        'ProjectTask',
    ];

    /**
     * Fully qualified class name declared in a PHP file.
     */
    private function classIn(string $file): string
    {
        preg_match('/^namespace ([^;]+);/m', file_get_contents($file), $m);

        return $m[1].'\\'.basename($file, '.php');
    }

    public function test_every_fillable_attribute_has_a_column(): void
    {
        $problems = [];
        $checked = 0;

        $files = array_merge(
            glob(app_path('Models/*.php')),
            glob(base_path('packages/*/src/Models/*.php')),
        );

        foreach ($files as $file) {
            $short = basename($file, '.php');
            $class = $this->classIn($file);

            if (! class_exists($class) || ! is_subclass_of($class, Model::class)) {
                continue;
            }

            if ((new \ReflectionClass($class))->isAbstract()) {
                continue;
            }

            /** @var Model $model */
            $model = new $class;
            $fillable = $model->getFillable();

            if ($fillable === [] || in_array($short, self::KNOWN_UNMAPPED, true)) {
                continue;
            }

            $table = $model->getTable();

            if (! Schema::hasTable($table)) {
                $problems[] = "{$short}: table '{$table}' does not exist";

                continue;
            }

            $checked++;
            $missing = array_values(array_filter($fillable, fn ($column) => ! Schema::hasColumn($table, $column)));

            if ($missing !== []) {
                $problems[] = "{$short} ({$table}): missing column(s) ".implode(', ', $missing);
            }
        }

        $this->assertGreaterThan(30, $checked, 'Expected to check the application models.');
        $this->assertSame([], $problems, "Model/schema mismatches:\n  ".implode("\n  ", $problems));
    }
}

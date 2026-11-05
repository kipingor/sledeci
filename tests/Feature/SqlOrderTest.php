<?php

namespace Tests\Feature;

use App\Support\SqlOrder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use InvalidArgumentException;
use Tests\TestCase;
use \Illuminate\Foundation\Testing\RefreshDatabase;

class SqlOrderTest extends TestCase
{

    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Schema::dropIfExists('sql_order_probe');
        Schema::create('sql_order_probe', function ($table) {
            $table->id();
            $table->string('severity');
        });
        foreach (['low', 'critical', 'medium', 'unknown', 'high'] as $severity) {
            DB::table('sql_order_probe')->insert(['severity' => $severity]);
        }
    }

    protected function tearDown(): void
    {
        Schema::dropIfExists('sql_order_probe');
        parent::tearDown();
    }

    public function test_orders_rows_by_an_explicit_value_list_on_mysql()
    {
        $ordered = DB::table('sql_order_probe')
            ->orderByRaw(SqlOrder::byList('severity', ['critical', 'high', 'medium', 'low']))
            ->pluck('severity')
            ->all();

        // listed values in list order, unlisted values last
        expect($ordered)->toBe(['critical', 'high', 'medium', 'low', 'unknown']);
    }

    public function test_escapes_quotes_in_list_values()
    {
        $ordered = DB::table('sql_order_probe')
            ->orderByRaw(SqlOrder::byList('severity', ["o'brien"]))
            ->pluck('severity')
            ->all();

        expect($ordered)->toBe(['o\'brien', 'critical', 'high', 'medium', 'low', 'unknown']);
    }

    public function test_rejects_unsafe_column_names()
    {
        $this->expectException(InvalidArgumentException::class);
        DB::table('sql_order_probe')
            ->orderByRaw(SqlOrder::byList('severity; DROP TABLE users', ['a']))
            ->pluck('severity')
            ->all();
    }
}
<?php

use App\Support\SqlOrder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

beforeEach(function () {
    Schema::create('sql_order_probe', function ($table) {
        $table->id();
        $table->string('severity');
    });

    foreach (['low', 'critical', 'medium', 'unknown', 'high'] as $severity) {
        DB::table('sql_order_probe')->insert(['severity' => $severity]);
    }
});

afterEach(fn () => Schema::dropIfExists('sql_order_probe'));

it('orders rows by an explicit value list on any database driver', function () {
    $ordered = DB::table('sql_order_probe')
        ->orderByRaw(SqlOrder::byList('severity', ['critical', 'high', 'medium', 'low']))
        ->pluck('severity')
        ->all();

    // listed values in list order, unlisted values last
    expect($ordered)->toBe(['critical', 'high', 'medium', 'low', 'unknown']);
});

it('escapes quotes in list values', function () {
    expect(SqlOrder::byList('severity', ["o'brien"]))->toContain("'o''brien'");
});

it('rejects unsafe column names', function () {
    SqlOrder::byList('severity; DROP TABLE users', ['a']);
})->throws(InvalidArgumentException::class);

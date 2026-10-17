<?php

namespace App\Support;

/**
 * Database-portable replacement for MySQL's FIELD(): order rows by an explicit list of values.
 *
 *   ->orderByRaw(SqlOrder::byList('severity', ['critical', 'high', 'medium', 'low']))
 *
 * Unlisted values sort last. $column must be a trusted identifier (never user input); the
 * list values are escaped.
 */
final class SqlOrder
{
    /** @param list<string> $values */
    public static function byList(string $column, array $values): string
    {
        if (! preg_match('/^[A-Za-z_][A-Za-z0-9_.]*$/', $column)) {
            throw new \InvalidArgumentException("Unsafe column name [{$column}].");
        }

        $cases = '';
        foreach (array_values($values) as $i => $value) {
            $cases .= ' WHEN '.self::quote($value)." THEN {$i}";
        }

        return "CASE {$column}{$cases} ELSE ".count($values).' END';
    }

    private static function quote(string $value): string
    {
        return "'".str_replace("'", "''", $value)."'";
    }
}

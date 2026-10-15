<?php

namespace App\Traits;

use Illuminate\Support\Facades\Cache;

trait Cacheable
{
    /**
     * Cache a query result.
     */
    public static function cacheQuery(string $key, int $ttl, callable $callback)
    {
        return Cache::remember($key, $ttl, $callback);
    }

    /**
     * Clear cache for a model.
     */
    public static function clearCache(string $pattern): void
    {
        $modelName = class_basename(static::class);
        $pattern = $pattern ?? strtolower($modelName) . '_*';
        
        // Clear all matching cache keys
        Cache::flush(); // Or implement pattern-based cache clearing
    }
}
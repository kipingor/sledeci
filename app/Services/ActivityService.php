<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Support\Facades\Auth;

/**
 * ActivityService is responsible for logging all significant model events to the audit trail.
 *
 */
class ActivityService
{
    /**
     * Log a model event to the audit trail.
     *
     * @param  string  $event      e.g. 'created', 'updated', 'deleted', 'status_changed'
     * @param  mixed   $subject    The Eloquent model being acted upon
     * @param  array   $oldValues  Previous attribute values (for updated events)
     * @param  array   $newValues  New attribute values
     * @return AuditLog
     */
    public static function log(
        string $event,
        mixed $subject,
        array $oldValues = [],
        array $newValues = [],
        ?int $userId = null,
    ): AuditLog {
        return AuditLog::create([
            'user_id'        => $userId ?? Auth::id(),
            'event'          => $event,
            'auditable_type' => get_class($subject),
            'auditable_id'   => $subject->getKey(),
            'old_values'     => $oldValues ?: null,
            'new_values'     => $newValues ?: null,
            'ip_address'     => request()->ip(),
            'user_agent'     => request()->userAgent(),
        ]);
    }

    /**
     * Convenience: log a creation event.
     */
    public static function created(mixed $subject): AuditLog
    {
        return static::log('created', $subject, [], $subject->toArray());
    }

    /**
     * Convenience: log an update event given dirty attributes.
     */
    public static function updated(mixed $subject, array $dirty, array $original): AuditLog
    {
        return static::log('updated', $subject, $original, $dirty);
    }

    /**
     * Convenience: log a deletion event.
     */
    public static function deleted(mixed $subject): AuditLog
    {
        return static::log('deleted', $subject, $subject->toArray(), []);
    }
}
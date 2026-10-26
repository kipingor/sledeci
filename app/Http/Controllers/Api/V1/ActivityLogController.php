<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\AuditLog;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * FIX: Previously used ActivityLog (deleted) which pointed to the same
 * audit_logs table as AuditLog — now uses AuditLog directly.
 * The ActivityLogResource has been replaced inline with a toArray transform
 * since the resource was referencing the wrong model anyway.
 */
class ActivityLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $logs = AuditLog::with('user:id,name,avatar')
            ->when($request->filled('event'),   fn ($q) => $q->event($request->event))
            ->when($request->filled('user_id'), fn ($q) => $q->byUser((int) $request->user_id))
            ->latest()
            ->paginate(20);

        return response()->json([
            'success' => true,
            'data'    => $logs->through(fn ($log) => $this->transform($log)),
            'meta'    => [
                'current_page' => $logs->currentPage(),
                'last_page'    => $logs->lastPage(),
                'total'        => $logs->total(),
            ],
        ]);
    }

    public function show(AuditLog $auditLog): JsonResponse
    {
        $auditLog->load('user:id,name,avatar');

        return response()->json([
            'success' => true,
            'data'    => $this->transform($auditLog),
        ]);
    }

    private function transform(AuditLog $log): array
    {
        return [
            'id'             => $log->id,
            'event'          => $log->event,
            'auditable_type' => class_basename($log->auditable_type),
            'auditable_id'   => $log->auditable_id,
            'old_values'     => $log->old_values,
            'new_values'     => $log->new_values,
            'ip_address'     => $log->ip_address,
            'user'           => $log->user ? [
                'id'     => $log->user->id,
                'name'   => $log->user->name,
                'avatar' => $log->user->avatar,
            ] : null,
            'summary'        => $log->change_summary,
            'created_at'     => $log->created_at,
        ];
    }
}
<?php

use App\Http\Controllers\Web\ApprovalController;
use App\Http\Controllers\Web\AuditLogController;
use App\Http\Controllers\Web\DashboardController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Core: dashboard JSON endpoints, maker-checker approvals, audit log
|--------------------------------------------------------------------------
| Loaded inside the auth + verified + module.access group in routes/web.php,
| so route names are prefixed "web." at runtime.
*/

Route::get('/api/dashboard/metrics', [DashboardController::class, 'metrics'])->name('dashboard.metrics');
Route::post('/api/dashboard/clear-cache', [DashboardController::class, 'clearCache'])->name('dashboard.clear-cache');

Route::get('approvals', [ApprovalController::class, 'index'])->name('approvals.index');
Route::post('approvals/{approvalRequest}/approve', [ApprovalController::class, 'approve'])->name('approvals.approve');
Route::post('approvals/{approvalRequest}/reject', [ApprovalController::class, 'reject'])->name('approvals.reject');

Route::get('audit-logs', [AuditLogController::class, 'index'])->name('audit-logs.index');

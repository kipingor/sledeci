<?php

use App\Http\Controllers\Web\LeadAnalyticsController;
use App\Http\Controllers\Web\ReportsController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Reports and analytics
|--------------------------------------------------------------------------
*/

Route::get('reports', [ReportsController::class, 'index'])->name('reports.index');
Route::get('analytics/leads', [LeadAnalyticsController::class, 'getLeadAnalytics'])->name('analytics.leads');
Route::get('analytics/performance', [LeadAnalyticsController::class, 'getPerformanceMetrics'])->name('analytics.performance');

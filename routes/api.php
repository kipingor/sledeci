<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\AiController;
use App\Http\Controllers\Api\V1\UploadController;
use App\Http\Controllers\Api\V1\PipelineController;
use App\Http\Controllers\Api\V1\TaskController;
use App\Http\Controllers\Api\V1\LeadController;
use App\Http\Controllers\Api\V1\ActivityController;
use App\Http\Controllers\Api\V1\ImportExportController;
use App\Http\Controllers\Api\V1\DashboardAnalyticsController;
use App\Http\Controllers\Api\V1\LeadDocumentController;
use App\Http\Controllers\Api\V1\LeadQuestionController;
use App\Http\Controllers\Api\V1\OpportunityController;
use App\Http\Controllers\Api\V1\ProjectController;
use App\Http\Controllers\Api\V1\ProposalController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\FinancialDashboardController;
use Illuminate\Http\JsonResponse;

/*
|--------------------------------------------------------------------------
| API v1 Routes
|--------------------------------------------------------------------------
| Prefix all with /api/v1 (Laravel will prefix with /api automatically)
*/

Route::prefix('v1')->name('api.')->group(function () {

    // Public routes (if any)
    Route::get('/health', function () {
        return response()->json([
            'status' => 'healthy',
            'timestamp' => now()->toISOString(),
        ]);
    });

    // Sanctum CSRF cookie route is provided by package (/sanctum/csrf-cookie)
    // Protected routes (Sanctum)
    Route::middleware(['auth:sanctum', 'throttle:api', 'module.access'])->group(function () {

        Route::get('/user', function (Request $request) {
            return response()->json([
                'success' => true,
                'data' => $request->user(),
            ]);
        });

        // ========================================================================
        // LEADS MANAGEMENT
        // ========================================================================
        // FIXED: Custom routes BEFORE resource routes to prevent {id} matching

        // Custom lead routes (specific paths first)
        Route::get('leads/statistics', [LeadController::class, 'statistics'])
            ->name('leads.statistics');

        Route::post('leads/bulk', [LeadController::class, 'bulkStore'])
            ->name('leads.bulk-store');

        Route::patch('leads/bulk', [LeadController::class, 'bulkUpdate'])
            ->name('leads.bulk-update');

        Route::delete('leads/bulk', [LeadController::class, 'bulkDestroy'])
            ->name('leads.bulk-destroy');

        // Lead-specific action routes
        Route::post('leads/{lead}/transition', [LeadController::class, 'transition'])
            ->name('leads.transition');

        Route::post('leads/{lead}/toggle-star', [LeadController::class, 'toggleStar'])
            ->name('leads.toggle-star');

        Route::get('leads/{lead}/available-transitions', [LeadController::class, 'availableTransitions'])
            ->name('leads.available-transitions');

        // Bulk operations
        Route::post('leads/bulk-delete', [LeadController::class, 'bulkDelete'])
            ->name('leads.bulk-delete');
        
        Route::post('leads/bulk-archive', [LeadController::class, 'bulkArchive'])
            ->name('leads.bulk-archive');
        
        Route::post('leads/bulk-update-status', [LeadController::class, 'bulkUpdateStatus'])
            ->name('leads.bulk-update-status');
        
        Route::post('leads/bulk-assign-owner', [LeadController::class, 'bulkAssignOwner'])
            ->name('leads.bulk-assign-owner');

        Route::post('leads/{lead}/restore', [LeadController::class, 'restore'])
            ->name('leads.restore');

        // Standard resource routes (must be last for leads)
        Route::apiResource('leads', LeadController::class);

        // ========================================================================
        // LEAD DOCUMENTS
        // ========================================================================
        Route::prefix('leads/{lead}')->group(function () {
            Route::post('documents', [LeadDocumentController::class, 'store'])
                ->name('leads.documents.store');
            Route::get('documents', [LeadDocumentController::class, 'index'])
                ->name('leads.documents.index');
        });

        Route::prefix('documents')->group(function () {
            Route::get('{document}', [LeadDocumentController::class, 'show'])
                ->name('documents.show');
            Route::delete('{document}', [LeadDocumentController::class, 'destroy'])
                ->name('documents.destroy');
            Route::get('{document}/download', [LeadDocumentController::class, 'download'])
                ->name('documents.download');
        });

        // ========================================================================
        // LEAD ACTIVITIES
        // ========================================================================
        Route::prefix('leads/{lead}')->name('leads.')->group(function () {
            Route::get('activities', [ActivityController::class, 'index'])
                ->name('activities.index');
            Route::post('activities', [ActivityController::class, 'store'])
                ->name('activities.store');
            Route::get('activities/{activity}', [ActivityController::class, 'show'])
                ->name('activities.show');
            Route::put('activities/{activity}', [ActivityController::class, 'update'])
                ->name('activities.update');
            Route::delete('activities/{activity}', [ActivityController::class, 'destroy'])
                ->name('activities.destroy');
            Route::post('activities/{activity}/complete', [ActivityController::class, 'complete'])
                ->name('activities.complete');
            Route::get('activities-stats', [ActivityController::class, 'statistics'])
                ->name('activities.statistics');
        });

        // ========================================================================
        // LEAD QUESTIONS
        // ========================================================================
        Route::apiResource('questions', LeadQuestionController::class)
            ->except(['create', 'edit']);

        // ========================================================================
        // PIPELINE MANAGEMENT
        // ========================================================================
        Route::get('pipelines', [PipelineController::class, 'index'])
            ->name('pipelines.index');

        Route::put('leads/{lead}/move', [PipelineController::class, 'move'])
            ->name('leads.move');

        Route::get('pipelines/{stage}/leads', [PipelineController::class, 'getLeads'])
            ->name('pipelines.leads');

        // ========================================================================
        // IMPORT/EXPORT
        // ========================================================================
        Route::prefix('import-export')->name('import-export.')->group(function () {
            // Import
            Route::post('upload', [ImportExportController::class, 'uploadImportFile'])
                ->name('upload');
            Route::post('start', [ImportExportController::class, 'startImport'])
                ->name('start');
            Route::get('imports', [ImportExportController::class, 'listImports'])
                ->name('list');
            Route::get('imports/{importJob}', [ImportExportController::class, 'getImportStatus'])
                ->name('status');
            Route::delete('imports/{importJob}', [ImportExportController::class, 'deleteImport'])
                ->name('delete');
            
            // Export
            Route::post('export', [ImportExportController::class, 'export'])
                ->name('export');
            
            // Template
            Route::get('template', [ImportExportController::class, 'downloadTemplate'])
                ->name('template');
        });

        // ========================================================================
        // DASHBOARD ANALYTICS
        // ========================================================================
        Route::prefix('analytics')->name('analytics.')->group(function () {
            Route::get('overview', [DashboardAnalyticsController::class, 'overview'])
                ->name('overview');
            Route::get('leads-by-status', [DashboardAnalyticsController::class, 'leadsByStatus'])
                ->name('leads-by-status');
            Route::get('leads-by-source', [DashboardAnalyticsController::class, 'leadsBySource'])
                ->name('leads-by-source');
            Route::get('pipeline-by-stage', [DashboardAnalyticsController::class, 'pipelineByStage'])
                ->name('pipeline-by-stage');
            Route::get('conversion-funnel', [DashboardAnalyticsController::class, 'conversionFunnel'])
                ->name('conversion-funnel');
            Route::get('leads-over-time', [DashboardAnalyticsController::class, 'leadsOverTime'])
                ->name('leads-over-time');
            Route::get('activity-stats', [DashboardAnalyticsController::class, 'activityStats'])
                ->name('activity-stats');
            Route::get('lead-velocity', [DashboardAnalyticsController::class, 'leadVelocity'])
                ->name('lead-velocity');
            Route::get('team-performance', [DashboardAnalyticsController::class, 'teamPerformance'])
                ->name('team-performance');
            Route::get('win-loss-analysis', [DashboardAnalyticsController::class, 'winLossAnalysis'])
                ->name('win-loss-analysis');
            Route::get('dashboard', [DashboardAnalyticsController::class, 'dashboard'])
                ->name('dashboard');
        });

        // ========================================================================
        // OPPORTUNITIES
        // ========================================================================
        // Custom opportunity routes first
        Route::get('opportunities/statistics', [OpportunityController::class, 'statistics'])
            ->name('opportunities.statistics');
        Route::get('opportunities/kanban', [OpportunityController::class, 'kanban'])
            ->name('opportunities.kanban');
        Route::post('opportunities/{opportunity}/move-stage', [OpportunityController::class, 'moveStage'])
            ->name('opportunities.move-stage');
        Route::post('opportunities/{opportunity}/mark-won', [OpportunityController::class, 'markAsWon'])
            ->name('opportunities.mark-won');
        Route::post('opportunities/{opportunity}/mark-lost', [OpportunityController::class, 'markAsLost'])
            ->name('opportunities.mark-lost');

        Route::apiResource('opportunities', OpportunityController::class);

        // ========================================================================
        // PROJECTS & TASKS
        // ========================================================================
        // Custom project routes first (if any exist)
        // Route::get('projects/statistics', [ProjectController::class, 'statistics']);

        Route::apiResource('projects', ProjectController::class);

        Route::prefix('projects/{project}')->group(function () {
            Route::get('tasks', [ProjectController::class, 'getTasks'])
                ->name('projects.tasks.index');

            Route::post('tasks', [ProjectController::class, 'createTask'])
                ->name('projects.tasks.store');

            Route::post('tasks/bulk-update', [ProjectController::class, 'bulkUpdateTasks'])
                ->name('projects.tasks.bulk-update');

            // Statistics
            Route::get('statistics', [ProjectController::class, 'getStatistics'])
                ->name('projects.statistics');
        });

        // Custom task routes first (if any exist)
        // Route::get('tasks/statistics', [TaskController::class, 'statistics']);

        Route::apiResource('tasks', controller: TaskController::class);
        // Individual task operations
        Route::prefix('tasks/{task}')->group(function () {
            Route::put('/', [ProjectController::class, 'updateTask'])
                ->name('projects.tasks.update');

            Route::post('move', [ProjectController::class, 'moveTask'])
                ->name('tasks.move');

            Route::delete('/', [ProjectController::class, 'deleteTask'])
                ->name('tasks.destroy');

            // Task comments/notes/mitigations
            Route::get('comments', [TaskController::class, 'comments'])
                ->name('tasks.comments.index');
            Route::post('comments', [TaskController::class, 'addComment'])
                ->name('tasks.comments.store');
            Route::delete('comments/{comment}', [TaskController::class, 'deleteComment'])
                ->name('tasks.comments.destroy');
        });

        // Project complete / reopen
        Route::post('projects/{project}/complete', [ProjectController::class, 'completeProject'])
            ->name('projects.complete');

        // Client report metrics (AJAX — used by report create form)
        Route::get('client-report-metrics', [\Sledeci\Clients\Http\Controllers\ClientReportController::class, 'metrics'])
            ->name('client-report-metrics');
        
        // ========================================================================
        // PROPOSALS
        // ========================================================================
        // Custom routes BEFORE resource
        Route::post('proposals/generate', [ProposalController::class, 'generate'])
            ->name('proposals.generate');

        Route::apiResource('proposals', ProposalController::class)
            ->except(['create', 'edit']);

        // ========================================================================
        // AI SERVICES
        // ========================================================================
        Route::prefix('ai')->group(function () {
            Route::post('generate', [AiController::class, 'generateContent'])
                ->name('ai.generate');

            Route::post('follow-up', [AiController::class, 'followUp'])
                ->name('ai.follow-up');

            Route::post('extract-document', [AiController::class, 'extractDocument'])
                ->name('ai.extract-document');
        });

        // ========================================================================
        // FILE UPLOADS
        // ========================================================================
        Route::post('upload/lead-document', [UploadController::class, 'uploadLeadDocument'])
            ->name('upload.lead-document');

        // ========================================================================
        // PROJECT TEMPLATES
        // ========================================================================
        Route::post('project-templates/{template}/duplicate', [\App\Http\Controllers\Api\V1\ProjectTemplateController::class, 'duplicate'])
            ->name('project-templates.duplicate');
        Route::apiResource('project-templates', \App\Http\Controllers\Api\V1\ProjectTemplateController::class);

        // ========================================================================
        // AUTOMATION RULES
        // ========================================================================
        Route::post('automation-rules/{rule}/test', [\App\Http\Controllers\Api\V1\AutomationRuleController::class, 'test'])
            ->name('automation-rules.test');
        Route::apiResource('automation-rules', \App\Http\Controllers\Api\V1\AutomationRuleController::class);

        // ========================================================================
        // AUTOMATION LOGS
        // ========================================================================
        Route::post('automation-logs/{log}/retry', [\App\Http\Controllers\Api\V1\AutomationLogController::class, 'retry'])
            ->name('automation-logs.retry');
        Route::apiResource('automation-logs', \App\Http\Controllers\Api\V1\AutomationLogController::class)
            ->only(['index', 'show']);

        // ========================================================================
        // DASHBOARD METRICS
        // ========================================================================
        Route::prefix('dashboard')->middleware('auth:sanctum')->group(function () {
            Route::get('metrics', [DashboardController::class, 'metrics'])->name('dashboard.metrics');
            Route::get('activities', [DashboardController::class, 'activities'])->name('dashboard.activities');
            Route::get('performance', [DashboardController::class, 'performance'])->name('dashboard.performance');
            Route::get('recent-activities', [DashboardController::class, 'recentActivities'])->name('dashboard.recent-activities');
            Route::get('top-performers', [DashboardController::class, 'topPerformers'])->name('dashboard.top-performers');
            Route::get('leads-chart', [DashboardController::class, 'leadsChart'])->name('dashboard.leads-chart');
            Route::get('conversion-funnel', [DashboardController::class, 'conversionFunnel'])->name('dashboard.conversion-funnel');
            Route::post('clear-cache', [DashboardController::class, 'clearCache'])->name('dashboard.clear-cache');
            Route::get('financial-pulse', [FinancialDashboardController::class, 'index'])->name('dashboard.financial-pulse');
        });
    });
});
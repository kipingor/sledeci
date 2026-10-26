<?php

use App\Http\Controllers\Web\ProjectChangeController;
use App\Http\Controllers\Web\ProjectIssueController;
use App\Http\Controllers\Web\ProjectLessonController;
use App\Http\Controllers\Web\ProjectRiskController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| PMBOK governance: risks, issues, change requests, lessons learned
| (stakeholder routes remain in modules.php)
|--------------------------------------------------------------------------
*/

Route::post('projects/{project}/risks', [ProjectRiskController::class, 'store'])->name('projects.risks.store');
Route::put('projects/{project}/risks/{risk}', [ProjectRiskController::class, 'update'])->name('projects.risks.update');
Route::delete('projects/{project}/risks/{risk}', [ProjectRiskController::class, 'destroy'])->name('projects.risks.destroy');
Route::post('projects/{project}/risks/{risk}/realize', [ProjectRiskController::class, 'realize'])->name('projects.risks.realize');

Route::post('projects/{project}/issues', [ProjectIssueController::class, 'store'])->name('projects.issues.store');
Route::put('projects/{project}/issues/{issue}', [ProjectIssueController::class, 'update'])->name('projects.issues.update');
Route::delete('projects/{project}/issues/{issue}', [ProjectIssueController::class, 'destroy'])->name('projects.issues.destroy');

Route::post('projects/{project}/changes', [ProjectChangeController::class, 'store'])->name('projects.changes.store');
Route::post('projects/{project}/changes/{change}/approve', [ProjectChangeController::class, 'approve'])->name('projects.changes.approve');
Route::post('projects/{project}/changes/{change}/reject', [ProjectChangeController::class, 'reject'])->name('projects.changes.reject');
Route::post('projects/{project}/changes/{change}/implement', [ProjectChangeController::class, 'implement'])->name('projects.changes.implement');
Route::delete('projects/{project}/changes/{change}', [ProjectChangeController::class, 'destroy'])->name('projects.changes.destroy');

Route::post('projects/{project}/lessons', [ProjectLessonController::class, 'store'])->name('projects.lessons.store');
Route::put('projects/{project}/lessons/{lesson}', [ProjectLessonController::class, 'update'])->name('projects.lessons.update');
Route::delete('projects/{project}/lessons/{lesson}', [ProjectLessonController::class, 'destroy'])->name('projects.lessons.destroy');

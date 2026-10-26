<?php

use App\Http\Controllers\Web\Hiring\JobApplicationController;
use App\Http\Controllers\Web\Hiring\JobPostingController;
use App\Http\Controllers\Web\Hiring\LinkedInController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Hiring (HR): job postings, applications and LinkedIn announcements
|--------------------------------------------------------------------------
| Route names resolve to web.hr.* so the "hr" entry in config/access.php
| (human resource, manager, auditor) governs them. The public careers pages
| live in routes/site.php.
*/

Route::prefix('hr/jobs')->name('hr.jobs.')->group(function () {
    Route::get('/', [JobPostingController::class, 'index'])->name('index');
    Route::get('/create', [JobPostingController::class, 'create'])->name('create');
    Route::post('/', [JobPostingController::class, 'store'])->name('store');
    Route::get('/{job}/edit', [JobPostingController::class, 'edit'])->name('edit');
    Route::put('/{job}', [JobPostingController::class, 'update'])->name('update');
    Route::delete('/{job}', [JobPostingController::class, 'destroy'])->name('destroy');
    Route::post('/{job}/publish', [JobPostingController::class, 'publish'])->name('publish');
    Route::post('/{job}/close', [JobPostingController::class, 'close'])->name('close');

    Route::get('/{job}/linkedin', [LinkedInController::class, 'show'])->name('linkedin');
    Route::post('/{job}/linkedin', [LinkedInController::class, 'post'])->name('linkedin.post');
    Route::post('/{job}/linkedin/shared', [LinkedInController::class, 'markShared'])->name('linkedin.shared');
});

Route::prefix('hr/applications')->name('hr.applications.')->group(function () {
    Route::get('/', [JobApplicationController::class, 'index'])->name('index');
    Route::patch('/{application}', [JobApplicationController::class, 'update'])->name('update');
    Route::get('/{application}/resume', [JobApplicationController::class, 'resume'])->name('resume');
    Route::delete('/{application}', [JobApplicationController::class, 'destroy'])->name('destroy');
});

<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Web\LeadController;
use App\Http\Controllers\Web\LeadDocumentController;

/*
|--------------------------------------------------------------------------
| Lead Management Routes
|--------------------------------------------------------------------------
| Routes for managing leads through the web interface (Inertia)
*/

Route::prefix('leads')->name('leads.')->group(function () {
    
    // Lead CRUD operations
    Route::get('/', [LeadController::class, 'index'])->name('index');
    Route::get('/create', [LeadController::class, 'create'])->name('create');
    Route::post('/', [LeadController::class, 'store'])->name('store');
    Route::get('/{lead}', [LeadController::class, 'show'])->name('show');
    Route::get('/{lead}/edit', [LeadController::class, 'edit'])->name('edit');
    Route::put('/{lead}', [LeadController::class, 'update'])->name('update');
    Route::delete('/{lead}', [LeadController::class, 'destroy'])->name('destroy');
    
    // Lead status transitions
    Route::post('/{lead}/transition', [LeadController::class, 'transition'])->name('transition');
    
    // Lead documents (nested resource)
    Route::prefix('{lead}/documents')->name('documents.')->group(function () {
        Route::get('/', [LeadDocumentController::class, 'index'])->name('index');
        Route::get('/create', [LeadDocumentController::class, 'create'])->name('create');
        Route::post('/', [LeadDocumentController::class, 'store'])->name('store');
    });

    // Bulk Lead Operations
    // Bulk Delete
    Route::delete('/bulk-delete', [LeadController::class, 'bulkDelete'])
        ->name('bulk-delete');
    
    // Bulk Export
    Route::post('/bulk-export', [LeadController::class, 'bulkExport'])
        ->name('bulk-export');
    
    // Bulk Update Status
    Route::patch('/bulk-update-status', [LeadController::class, 'bulkUpdateStatus'])
        ->name('bulk-update-status');
    
    // Bulk Assign
    Route::patch('/bulk-assign', [LeadController::class, 'bulkAssign'])
        ->name('bulk-assign');
    
    // Bulk Update Stage
    Route::patch('/bulk-update-stage', [LeadController::class, 'bulkUpdateStage'])
        ->name('bulk-update-stage');
});

// Lead documents (standalone routes)
Route::prefix('lead-documents')->name('lead-documents.')->group(function () {
    Route::get('/{document}', [LeadDocumentController::class, 'show'])->name('show');
    Route::get('/{document}/edit', [LeadDocumentController::class, 'edit'])->name('edit');
    Route::put('/{document}', [LeadDocumentController::class, 'update'])->name('update');
    Route::delete('/{document}', [LeadDocumentController::class, 'destroy'])->name('destroy');
    Route::get('/{document}/download', [LeadDocumentController::class, 'download'])->name('download');
    Route::get('/{document}/preview', [LeadDocumentController::class, 'preview'])->name('preview');
});

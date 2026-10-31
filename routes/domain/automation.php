<?php

use App\Http\Controllers\Web\WorkflowController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Automation workflows (used by the workflow builder component)
|--------------------------------------------------------------------------
*/

Route::prefix('workflows')->name('workflows.')->group(function () {
    Route::get('/', [WorkflowController::class, 'index'])->name('index');
    Route::post('/', [WorkflowController::class, 'store'])->name('store');
    Route::put('/{workflow}', [WorkflowController::class, 'update'])->name('update');
    Route::patch('/{workflow}/toggle', [WorkflowController::class, 'toggle'])->name('toggle');
    Route::delete('/{workflow}', [WorkflowController::class, 'destroy'])->name('destroy');
});

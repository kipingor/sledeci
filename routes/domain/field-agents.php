<?php

use App\Http\Controllers\Web\FieldAgentController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Field agents: territories, check-in / check-out
|--------------------------------------------------------------------------
*/

Route::prefix('field-agents')->name('field-agents.')->group(function () {
    Route::get('/', [FieldAgentController::class, 'index'])->name('index');
    Route::get('/create', [FieldAgentController::class, 'create'])->name('create');
    Route::post('/', [FieldAgentController::class, 'store'])->name('store');
    Route::get('/territory-report', [FieldAgentController::class, 'territoryReport'])->name('territory-report');
    Route::post('/check-in', [FieldAgentController::class, 'checkIn'])->name('check-in');
    Route::post('/visits/{visit}/check-out', [FieldAgentController::class, 'checkOut'])->name('check-out');
    Route::get('/{fieldAgent}', [FieldAgentController::class, 'show'])->name('show');
    Route::patch('/{fieldAgent}', [FieldAgentController::class, 'update'])->name('update');
});
Route::get('my-visits', [FieldAgentController::class, 'myDashboard'])->name('field-agents.my-dashboard');

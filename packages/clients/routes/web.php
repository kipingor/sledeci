<?php

use Illuminate\Support\Facades\Route;
use Sledeci\Clients\Http\Controllers\ClientController;
use Sledeci\Clients\Http\Controllers\ClientFollowUpController;
use Sledeci\Clients\Http\Controllers\ClientReportController;

/*
|--------------------------------------------------------------------------
| Clients (pilot for extraction into sledeci/clients)
|--------------------------------------------------------------------------
*/

Route::resource('clients', ClientController::class);
Route::get('leads/{lead}/convert-to-client', [ClientController::class, 'convertFromLead'])->name('leads.convert-to-client');
Route::get('opportunities/{opportunity}/convert-to-client', [ClientController::class, 'convertFromOpportunity'])->name('opportunities.convert-to-client');

Route::get('follow-ups', [ClientFollowUpController::class, 'index'])->name('follow-ups.index');
Route::post('follow-ups', [ClientFollowUpController::class, 'store'])->name('follow-ups.store');
Route::put('follow-ups/{followUp}', [ClientFollowUpController::class, 'update'])->name('follow-ups.update');
Route::post('follow-ups/{followUp}/complete', [ClientFollowUpController::class, 'complete'])->name('follow-ups.complete');
Route::delete('follow-ups/{followUp}', [ClientFollowUpController::class, 'destroy'])->name('follow-ups.destroy');

Route::get('client-reports', [ClientReportController::class, 'index'])->name('client-reports.index');
Route::get('client-reports/create', [ClientReportController::class, 'create'])->name('client-reports.create');
Route::post('client-reports', [ClientReportController::class, 'store'])->name('client-reports.store');
Route::get('client-reports/{clientReport}', [ClientReportController::class, 'show'])->name('client-reports.show');
Route::post('client-reports/{clientReport}/send', [ClientReportController::class, 'send'])->name('client-reports.send');
Route::delete('client-reports/{clientReport}', [ClientReportController::class, 'destroy'])->name('client-reports.destroy');

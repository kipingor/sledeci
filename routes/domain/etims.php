<?php

use App\Http\Controllers\Web\EtimsController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| KRA eTIMS
|--------------------------------------------------------------------------
| EtimsController stays in the host until the kenya-tax package is extracted.
| It acts on invoices from the accounting package.
*/

Route::post('invoices/{invoice}/etims/submit', [EtimsController::class, 'submitInvoice'])->name('invoices.etims.submit');
Route::post('invoices/etims/bulk-submit', [EtimsController::class, 'bulkSubmit'])->name('invoices.etims.bulk-submit');
Route::get('invoices/{invoice}/etims/status', [EtimsController::class, 'invoiceStatus'])->name('invoices.etims.status');

Route::get('etims/standard-codes', [EtimsController::class, 'standardCodes'])->name('etims.standard-codes');
Route::get('etims/test-connection', [EtimsController::class, 'testConnection'])->name('etims.test-connection');

<?php

use Illuminate\Support\Facades\Route;
use Sledeci\KenyaTax\Http\Controllers\EtimsController;

/*
|--------------------------------------------------------------------------
| KRA eTIMS
|--------------------------------------------------------------------------
| Registered by KenyaTaxServiceProvider inside the standard module group
| (web, auth, verified, module.access; names prefixed "web."). The invoice
| routes act on invoices from the accounting package.
*/

Route::post('invoices/{invoice}/etims/submit', [EtimsController::class, 'submitInvoice'])->name('invoices.etims.submit');
Route::post('invoices/etims/bulk-submit', [EtimsController::class, 'bulkSubmit'])->name('invoices.etims.bulk-submit');
Route::get('invoices/{invoice}/etims/status', [EtimsController::class, 'invoiceStatus'])->name('invoices.etims.status');

Route::get('etims/standard-codes', [EtimsController::class, 'standardCodes'])->name('etims.standard-codes');
Route::get('etims/test-connection', [EtimsController::class, 'testConnection'])->name('etims.test-connection');

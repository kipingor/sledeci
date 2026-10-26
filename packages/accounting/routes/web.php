<?php

use Illuminate\Support\Facades\Route;
use Sledeci\Accounting\Http\Controllers\AccountingController;
use Sledeci\Accounting\Http\Controllers\ChartOfAccountsController;
use Sledeci\Accounting\Http\Controllers\ExpenseController;
use Sledeci\Accounting\Http\Controllers\FinancialReportsController;
use Sledeci\Accounting\Http\Controllers\FinancingController;
use Sledeci\Accounting\Http\Controllers\InvoiceController;
use Sledeci\Accounting\Http\Controllers\JournalEntryController;
use Sledeci\Accounting\Http\Controllers\PaymentController;

/*
|--------------------------------------------------------------------------
| Accounting package routes
|--------------------------------------------------------------------------
| Registered by AccountingServiceProvider inside the standard module group
| (web, auth, verified, module.access; names prefixed "web."). Route names are
| unchanged from before the extraction.
*/

// ── Invoices (static paths first so /invoices/forex-rates is not read as {invoice}) ──
Route::get('/invoices', [InvoiceController::class, 'index'])->name('invoices.index');
Route::get('/invoices/create', [InvoiceController::class, 'create'])->name('invoices.create');
Route::post('/invoices', [InvoiceController::class, 'store'])->name('invoices.store');
Route::get('/invoices/forex-rates', [InvoiceController::class, 'forexRates'])->name('invoices.forex-rates');
Route::get('/invoices/{invoice}/edit', [InvoiceController::class, 'edit'])->name('invoices.edit');
Route::get('/invoices/{invoice}', [InvoiceController::class, 'show'])->name('invoices.show');
Route::put('/invoices/{invoice}', [InvoiceController::class, 'update'])->name('invoices.update');
Route::delete('/invoices/{invoice}', [InvoiceController::class, 'destroy'])->name('invoices.destroy');
Route::post('/invoices/{invoice}/payment', [InvoiceController::class, 'recordPayment'])->name('invoices.payment');
Route::post('/invoices/{invoice}/send', [InvoiceController::class, 'send'])->name('invoices.send');
Route::post('/invoices/{invoice}/send-whatsapp', [InvoiceController::class, 'sendWhatsApp'])->name('invoices.send-whatsapp');
Route::post('/invoices/{invoice}/reminder', [InvoiceController::class, 'sendReminder'])->name('invoices.reminder');
Route::post('/invoices/{invoice}/cancel', [InvoiceController::class, 'cancel'])->name('invoices.cancel');
Route::get('/invoices/{invoice}/pdf', [InvoiceController::class, 'downloadPdf'])->name('invoices.pdf');

Route::get('accounting', [AccountingController::class, 'index'])->name('accounting.index');

// ── Invoice extras ─────────────────────────────────────────────────────
Route::prefix('invoices')->name('invoices.')->group(function () {
    Route::post('/{invoice}/mpesa-push', [InvoiceController::class, 'initiateMpesaPush'])->name('mpesa-push');
});

// ── Payments & expenses ────────────────────────────────────────────────
Route::resource('payments', PaymentController::class)->only(['index', 'show']);
Route::prefix('payments')->name('payments.')->group(function () {
    Route::patch('/{payment}/reconciliation', [PaymentController::class, 'updateReconciliation'])->name('reconciliation');
    Route::patch('/{payment}/link-invoice', [PaymentController::class, 'linkToInvoice'])->name('link-invoice');
});

// "ocr" is a static segment: register it before the {expense} resource routes.
Route::post('expenses/ocr', [ExpenseController::class, 'extractReceipt'])->name('expenses.ocr');
Route::resource('expenses', ExpenseController::class);
Route::post('expenses/{expense}/ocr-apply', [ExpenseController::class, 'applyOcr'])->name('expenses.ocr-apply');

// ── Chart of accounts ──────────────────────────────────────────────────
Route::prefix('accounting/chart')->name('chart-of-accounts.')->group(function () {
    Route::get('/', [ChartOfAccountsController::class, 'index'])->name('index');
    Route::post('/', [ChartOfAccountsController::class, 'store'])->name('store');
    Route::put('/{account}', [ChartOfAccountsController::class, 'update'])->name('update');
    Route::delete('/{account}', [ChartOfAccountsController::class, 'destroy'])->name('destroy');
});

// ── Accounting periods ─────────────────────────────────────────────────
Route::prefix('accounting/periods')->name('accounting-periods.')->group(function () {
    Route::get('/', [FinancialReportsController::class, 'periods'])->name('index');
    Route::post('/', [FinancialReportsController::class, 'createPeriods'])->name('create');
    Route::post('/{period}/close', [FinancialReportsController::class, 'closePeriod'])->name('close');
});

// ── Journal entries ────────────────────────────────────────────────────
Route::prefix('accounting/journal')->name('journal-entries.')->group(function () {
    Route::get('/', [JournalEntryController::class, 'index'])->name('index');
    Route::get('/create', [JournalEntryController::class, 'create'])->name('create');
    Route::post('/', [JournalEntryController::class, 'store'])->name('store');
    Route::post('/post-pending', [JournalEntryController::class, 'postPending'])->name('post-pending');
    Route::get('/{journalEntry}', [JournalEntryController::class, 'show'])->name('show');
    Route::post('/{journalEntry}/post', [JournalEntryController::class, 'post'])->name('post');
    Route::post('/{journalEntry}/reverse', [JournalEntryController::class, 'reverse'])->name('reverse');
});

// ── Financial statements ───────────────────────────────────────────────
Route::prefix('accounting/reports')->name('accounting-reports.')->group(function () {
    Route::get('/trial-balance', [FinancialReportsController::class, 'trialBalance'])->name('trial-balance');
    Route::get('/profit-loss', [FinancialReportsController::class, 'profitAndLoss'])->name('profit-loss');
    Route::get('/balance-sheet', [FinancialReportsController::class, 'balanceSheet'])->name('balance-sheet');
    Route::get('/cash-flows', [FinancialReportsController::class, 'cashFlows'])->name('cash-flows');
});

// ── Exchange rates ─────────────────────────────────────────────────────
Route::prefix('accounting/fx')->name('exchange-rates.')->group(function () {
    Route::get('/', [FinancialReportsController::class, 'exchangeRates'])->name('index');
    Route::post('/', [FinancialReportsController::class, 'storeExchangeRate'])->name('store');
});

// ── Invoice financing readiness ────────────────────────────────────────
Route::prefix('financing')->name('financing.')->group(function () {
    Route::get('/report', [FinancingController::class, 'report'])->name('report');
    Route::get('/export', [FinancingController::class, 'export'])->name('export');
});

<?php

use App\Http\Controllers\Web\RfpController;
use App\Http\Controllers\Web\TenderController;
use App\Http\Controllers\Web\TradeDocumentController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| RFPs / RFQs, tenders (extra actions) and cross-border trade documents
| Core tender CRUD + approval routes remain in modules.php.
|--------------------------------------------------------------------------
*/

Route::resource('rfps', RfpController::class)->only(['index', 'create', 'store', 'show', 'update', 'destroy']);
Route::post('rfps/{rfp}/request-approval', [RfpController::class, 'requestApproval'])->name('rfps.request-approval');
Route::post('rfps/{rfp}/approve', [RfpController::class, 'approveRequest'])->name('rfps.approve');
Route::post('rfps/{rfp}/reject', [RfpController::class, 'rejectRequest'])->name('rfps.reject');
Route::post('rfps/{rfp}/publish', [RfpController::class, 'publish'])->name('rfps.publish');
Route::post('rfps/{rfp}/close', [RfpController::class, 'close'])->name('rfps.close');
Route::post('rfps/{rfp}/award', [RfpController::class, 'award'])->name('rfps.award');

Route::post('tenders/{tender}/generate-document', [TenderController::class, 'generateDocument'])->name('tenders.generate-document');
Route::post('tenders/{tender}/chat', [TenderController::class, 'chat'])->name('tenders.chat');
Route::post('tenders/{tender}/answer-gap', [TenderController::class, 'answerGap'])->name('tenders.answer-gap');
Route::post('tenders/{tender}/toggle-checklist', [TenderController::class, 'toggleChecklist'])->name('tenders.toggle-checklist');
Route::post('tenders/{tender}/create-lead', [TenderController::class, 'createLeadAndOpportunity'])->name('tenders.create-lead');

Route::resource('trade-documents', TradeDocumentController::class)->only(['index', 'create', 'store', 'show', 'update', 'destroy']);
Route::prefix('trade-documents/{tradeDocument}')->name('trade-documents.')->group(function () {
    Route::post('/submit-certification', [TradeDocumentController::class, 'submitForCertification'])->name('submit-certification');
    Route::post('/certify', [TradeDocumentController::class, 'recordCertification'])->name('certify');
    Route::get('/pdf', [TradeDocumentController::class, 'downloadPdf'])->name('pdf');
});

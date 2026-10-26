<?php

use App\Http\Controllers\Web\SaccoController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| SACCO: members, savings, loans, dividends
|--------------------------------------------------------------------------
*/

Route::prefix('sacco')->name('sacco.')->group(function () {
    Route::get('/', [SaccoController::class, 'index'])->name('index');

    Route::post('/members', [SaccoController::class, 'enrollMember'])->name('members.enroll');
    Route::get('/members/{saccoMember}', [SaccoController::class, 'memberShow'])->name('members.show');
    Route::post('/members/{saccoMember}/deposit', [SaccoController::class, 'deposit'])->name('members.deposit');
    Route::post('/members/{saccoMember}/withdraw', [SaccoController::class, 'withdraw'])->name('members.withdraw');

    Route::post('/members/{saccoMember}/loans', [SaccoController::class, 'applyLoan'])->name('loans.apply');
    Route::post('/loans/{saccoLoan}/approve', [SaccoController::class, 'approveLoan'])->name('loans.approve');
    Route::post('/loans/{saccoLoan}/disburse', [SaccoController::class, 'disburseLoan'])->name('loans.disburse');
    Route::post('/loans/{saccoLoan}/repayment', [SaccoController::class, 'recordRepayment'])->name('loans.repayment');

    Route::post('/dividends', [SaccoController::class, 'distributeDividend'])->name('dividends.distribute');
});

<?php

use Illuminate\Support\Facades\Route;
use Sledeci\KenyaPayroll\Http\Controllers\PayrollController;

/*
|--------------------------------------------------------------------------
| Kenya payroll: employees, runs, payslips, P9
|--------------------------------------------------------------------------
| Registered by the package's service provider inside the standard module group
| (web, auth, verified, module.access; names prefixed "web."). Route names are
| unchanged from before the extraction.
*/

Route::get('/payroll', [PayrollController::class, 'index'])->name('payroll.index');
Route::get('/payroll/employees', [PayrollController::class, 'employees'])->name('payroll.employees');
Route::get('/payroll/employees/create', [PayrollController::class, 'createEmployee'])->name('payroll.employees.create');
Route::post('/payroll/employees', [PayrollController::class, 'storeEmployee'])->name('payroll.employees.store');
Route::get('/payroll/employees/{employee}/edit', [PayrollController::class, 'editEmployee'])->name('payroll.employees.edit');
Route::put('/payroll/employees/{employee}', [PayrollController::class, 'updateEmployee'])->name('payroll.employees.update');
Route::post('/payroll/runs', [PayrollController::class, 'createRun'])->name('payroll.runs.store');
Route::get('/payroll/runs/{payrollRun}', [PayrollController::class, 'showRun'])->name('payroll.run');
Route::post('/payroll/runs/{payrollRun}/compute', [PayrollController::class, 'computeRun'])->name('payroll.runs.compute');
Route::post('/payroll/runs/{payrollRun}/approve', [PayrollController::class, 'approveRun'])->name('payroll.runs.approve');
Route::post('/payroll/runs/{payrollRun}/paid', [PayrollController::class, 'markRunPaid'])->name('payroll.runs.paid');
Route::get('/payroll/payslips/{payslip}', [PayrollController::class, 'payslip'])->name('payroll.payslips.show');
Route::get('/payroll/p9/{year}', [PayrollController::class, 'p9Export'])->name('payroll.p9');
Route::post('/payroll/calculate', [PayrollController::class, 'calculate'])->name('payroll.calculate');

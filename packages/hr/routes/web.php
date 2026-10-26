<?php

use Illuminate\Support\Facades\Route;
use Sledeci\Hr\Http\Controllers\HRController;

/*
|--------------------------------------------------------------------------
| HR: staff directory and leave
|--------------------------------------------------------------------------
| Registered by the package's service provider inside the standard module group
| (web, auth, verified, module.access; names prefixed "web."). Route names are
| unchanged from before the extraction.
*/

Route::get('/hr', [HRController::class, 'index'])->name('hr.index');
Route::get('/hr/staff', [HRController::class, 'staff'])->name('hr.staff.index');
Route::get('/hr/staff/create', [HRController::class, 'create'])->name('hr.staff.create');
Route::post('/hr/staff', [HRController::class, 'store'])->name('hr.staff.store');
Route::get('/hr/staff/{id}', [HRController::class, 'show'])->name('hr.staff.show');
Route::get('/hr/staff/{id}/edit', [HRController::class, 'edit'])->name('hr.staff.edit');
Route::put('/hr/staff/{id}', [HRController::class, 'update'])->name('hr.staff.update');
Route::get('/hr/leave', [HRController::class, 'leave'])->name('hr.leave.index');
Route::post('/hr/leave/{leave}/approve', [HRController::class, 'approveLeave'])->name('hr.leave.approve');
Route::post('/hr/leave/{leave}/reject', [HRController::class, 'rejectLeave'])->name('hr.leave.reject');

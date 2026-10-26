<?php

use App\Http\Controllers\Web\HRController;
use App\Http\Controllers\Web\MilestoneController;
use App\Http\Controllers\Web\PayrollController;
use App\Http\Controllers\Web\ProjectController;
use App\Http\Controllers\Web\ProjectStakeholderController;
use App\Http\Controllers\Web\TenderController;
use App\Http\Controllers\Web\TimeLogController;
use App\Http\Controllers\Web\UserController;
use Illuminate\Support\Facades\Route;

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

Route::get('/users', [UserController::class, 'index'])->name('users.index');
Route::get('/users/create', [UserController::class, 'create'])->name('users.create');
Route::post('/users', [UserController::class, 'store'])->name('users.store');
Route::get('/users/{user}/edit', [UserController::class, 'edit'])->name('users.edit');
Route::put('/users/{user}', [UserController::class, 'update'])->name('users.update');
Route::delete('/users/{user}', [UserController::class, 'destroy'])->name('users.destroy');
Route::patch('/users/{user}/roles', [UserController::class, 'syncRoles'])->name('users.roles');
Route::post('/users/{user}/reset-password', [UserController::class, 'resetPassword'])->name('users.reset-password');
Route::post('/users/{user}/toggle-active', [UserController::class, 'toggleActive'])->name('users.toggle-active');

Route::get('/time-logs', [TimeLogController::class, 'index'])->name('time-logs.index');
Route::get('/time-logs/create', [TimeLogController::class, 'create'])->name('time-logs.create');
Route::post('/time-logs', [TimeLogController::class, 'store'])->name('time-logs.store');

Route::get('/projects', [ProjectController::class, 'index'])->name('projects.index');
Route::get('/projects/create', [ProjectController::class, 'create'])->name('projects.create');
Route::post('/projects', [ProjectController::class, 'store'])->name('projects.store');
Route::get('/projects/at-risk', [ProjectController::class, 'atRisk'])->name('projects.at-risk');
Route::get('/projects/{project}/edit', [ProjectController::class, 'edit'])->name('projects.edit');
Route::get('/projects/{project}', [ProjectController::class, 'show'])->name('projects.show');
Route::put('/projects/{project}', [ProjectController::class, 'update'])->name('projects.update');
Route::delete('/projects/{project}', [ProjectController::class, 'destroy'])->name('projects.destroy');
Route::post('/projects/{project}/clone', [ProjectController::class, 'clone'])->name('projects.clone');
Route::post('/projects/{project}/status', [ProjectController::class, 'updateStatus'])->name('projects.status');
Route::post('/projects/{project}/advance-phase', [ProjectController::class, 'advancePhase'])->name('projects.advance-phase');
Route::get('/projects/{project}/export', [ProjectController::class, 'export'])->name('projects.export');
Route::post('/projects/{project}/members', [ProjectController::class, 'addMember'])->name('projects.members.store');
Route::delete('/projects/{project}/members/{user}', [ProjectController::class, 'removeMember'])->name('projects.members.destroy');
Route::post('/projects/{project}/stakeholders', [ProjectStakeholderController::class, 'store'])->name('projects.stakeholders.store');
Route::put('/projects/{project}/stakeholders/{stakeholder}', [ProjectStakeholderController::class, 'update'])->name('projects.stakeholders.update');
Route::delete('/projects/{project}/stakeholders/{stakeholder}', [ProjectStakeholderController::class, 'destroy'])->name('projects.stakeholders.destroy');

Route::get('/milestones', [MilestoneController::class, 'index'])->name('milestones.index');
Route::get('/projects/{project}/milestones/create', [MilestoneController::class, 'create'])->name('milestones.create');
Route::post('/projects/{project}/milestones', [MilestoneController::class, 'store'])->name('milestones.store');
Route::get('/milestones/{milestone}', [MilestoneController::class, 'show'])->name('milestones.show');
Route::get('/milestones/{milestone}/edit', [MilestoneController::class, 'edit'])->name('milestones.edit');
Route::put('/milestones/{milestone}', [MilestoneController::class, 'update'])->name('milestones.update');
Route::delete('/milestones/{milestone}', [MilestoneController::class, 'destroy'])->name('milestones.destroy');
Route::post('/milestones/{milestone}/complete', [MilestoneController::class, 'complete'])->name('milestones.complete');

Route::get('/tenders', [TenderController::class, 'index'])->name('tenders.index');
Route::get('/tenders/create', [TenderController::class, 'create'])->name('tenders.create');
Route::post('/tenders', [TenderController::class, 'store'])->name('tenders.store');
Route::get('/tenders/{tender}', [TenderController::class, 'show'])->name('tenders.show');
Route::put('/tenders/{tender}', [TenderController::class, 'update'])->name('tenders.update');
Route::delete('/tenders/{tender}', [TenderController::class, 'destroy'])->name('tenders.destroy');
Route::post('/tenders/{tender}/request-approval', [TenderController::class, 'requestApproval'])->name('tenders.request-approval');
Route::post('/tenders/{tender}/approve', [TenderController::class, 'approveRequest'])->name('tenders.approve');
Route::post('/tenders/{tender}/reject', [TenderController::class, 'rejectRequest'])->name('tenders.reject');
Route::post('/tenders/{tender}/reanalyze', [TenderController::class, 'reanalyze'])->name('tenders.reanalyze');
Route::post('/tenders/{tender}/submit', [TenderController::class, 'submit'])->name('tenders.submit');
Route::post('/tenders/{tender}/won', [TenderController::class, 'markWon'])->name('tenders.won');
Route::post('/tenders/{tender}/lost', [TenderController::class, 'markLost'])->name('tenders.lost');
Route::post('/tenders/{tender}/convert-to-project', [TenderController::class, 'convertToProject'])->name('tenders.convert-to-project');

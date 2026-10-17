<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Laravel\Fortify\Features;
use App\Http\Controllers\Web\DashboardController;
use App\Http\Controllers\Web\OpportunityController;
use App\Http\Controllers\Web\ProjectController;
use App\Http\Controllers\Web\HRController;
use App\Http\Controllers\Web\MailgunWebhookController;
use App\Http\Controllers\Web\AccountingController;
use App\Http\Controllers\Web\ClientReportController;
use App\Http\Controllers\Web\ClientFollowUpController;
use App\Http\Controllers\Web\InvoiceController;
use App\Http\Controllers\Web\PipelineController;
use App\Http\Controllers\Web\ActivityController;
use App\Http\Controllers\Web\ConversationController;
use App\Http\Controllers\Web\SupplierController;
use App\Http\Controllers\Web\DeliveryController;
use App\Http\Controllers\Web\PurchaseOrderController;
use App\Http\Controllers\Web\ProductController;
use App\Http\Controllers\Web\ClientController;
use App\Http\Controllers\Web\ReportsController;
use App\Http\Controllers\Web\LeadAnalyticsController;
use App\Http\Controllers\Web\ContactController;
use App\Http\Controllers\Web\TenderController;
use App\Http\Controllers\Web\ProjectRiskController;
use App\Http\Controllers\Web\ProjectIssueController;
use App\Http\Controllers\Web\ProjectChangeController;
use App\Http\Controllers\Web\ProjectStakeholderController;
use App\Http\Controllers\Web\ProjectLessonController;
use App\Http\Controllers\Web\LeadController;
use App\Http\Controllers\Web\LeadDocumentController;
use App\Http\Controllers\Web\ExpenseController;
use App\Http\Controllers\Web\PaymentController;
use App\Http\Controllers\Web\AuditLogController;
use App\Http\Controllers\Web\EmailController;
use App\Http\Controllers\Web\TimeLogController;
use App\Http\Controllers\Web\UserController;
use App\Http\Controllers\Web\MilestoneController;
use App\Http\Controllers\Web\ApprovalController;
use App\Http\Controllers\Web\EtimsController;
use App\Http\Controllers\Web\RfpController;
use App\Http\Controllers\Web\MobileMoneyWebhookController;
use App\Http\Controllers\Web\FieldAgentController;
use App\Http\Controllers\Web\InventoryController;
use App\Http\Controllers\Web\PosController;
use App\Http\Controllers\Web\TradeDocumentController;
use App\Http\Controllers\Web\FinancingController;
use App\Http\Controllers\Web\PayrollController;
use App\Http\Controllers\Web\SaccoController;
use App\Http\Controllers\Web\Accounting\JournalEntryController;
use App\Http\Controllers\Web\Accounting\FinancialReportsController;
use App\Http\Controllers\Web\Accounting\ChartOfAccountsController;

// ── Mailgun inbound webhook ────────────────────────────────────────────────────
Route::post('/webhooks/mailgun/inbound', [MailgunWebhookController::class, 'inbound'])
    ->name('webhooks.mailgun.inbound')
    ->withoutMiddleware(['web', 'auth', 'verified']);

Route::prefix('webhooks')->name('webhooks.')->middleware('webhook.token')->group(function () {

    // M-Pesa Daraja
    Route::post('mpesa/pos-callback',     [MobileMoneyWebhookController::class, 'mpesaPosCallback'])->name('mpesa.pos-callback');
    Route::post('mpesa/stk-callback',     [MobileMoneyWebhookController::class, 'mpesaStkCallback'])->name('mpesa.callback');
    Route::post('mpesa/c2b-validation',   [MobileMoneyWebhookController::class, 'mpesaC2BValidation'])->name('mpesa.c2b-validation');
    Route::post('mpesa/c2b-confirmation', [MobileMoneyWebhookController::class, 'mpesaC2BConfirmation'])->name('mpesa.c2b-confirmation');

    // Airtel Money
    Route::post('airtel/callback',        [MobileMoneyWebhookController::class, 'airtelCallback'])->name('airtel.callback');

    // MTN MoMo
    Route::post('mtn/callback',           [MobileMoneyWebhookController::class, 'mtnCallback'])->name('mtn.callback');
});

// ── Public root ───────────────────────────────────────────────────────────────
Route::get('/', function () {
    if (Auth::check()) {
        return redirect()->route('web.dashboard');
    }
    return Inertia::render('welcome', [
        'canRegister' => Features::enabled(Features::registration()),
    ]);
})->name('home');

Route::get('/welcome', function () {
    return redirect()->route('home');
});

// ══════════════════════════════════════════════════════════════════════════════
// Authenticated routes
// ══════════════════════════════════════════════════════════════════════════════
Route::middleware(['auth', 'verified', 'module.access'])->name('web.')->group(function () {

    // ── Dashboard ─────────────────────────────────────────────────────────────
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('/api/dashboard/metrics', [DashboardController::class, 'metrics'])->name('dashboard.metrics');
    Route::post('/api/dashboard/clear-cache', [DashboardController::class, 'clearCache'])->name('dashboard.clear-cache');

    // ── Leads ─────────────────────────────────────────────────────────────────
    Route::prefix('leads')->name('leads.')->whereNumber('lead')->group(function () {
        Route::get('/', [LeadController::class, 'index'])->name('index');
        Route::get('/create', [LeadController::class, 'create'])->name('create');
        Route::post('/', [LeadController::class, 'store'])->name('store');
        Route::get('/{lead}', [LeadController::class, 'show'])->name('show');
        Route::get('/{lead}/edit', [LeadController::class, 'edit'])->name('edit');
        Route::put('/{lead}', [LeadController::class, 'update'])->name('update');
        Route::delete('/{lead}', [LeadController::class, 'destroy'])->name('destroy');
        Route::post('/{lead}/restore', [LeadController::class, 'restore'])->name('restore');
        Route::post('/{lead}/transition', [LeadController::class, 'transition'])->name('transition');
        Route::delete('/bulk-delete', [LeadController::class, 'bulkDelete'])->name('bulk-delete');
        Route::post('/bulk-export', [LeadController::class, 'bulkExport'])->name('bulk-export');
        Route::patch('/bulk-update-status', [LeadController::class, 'bulkUpdateStatus'])->name('bulk-update-status');
        Route::patch('/bulk-assign', [LeadController::class, 'bulkAssign'])->name('bulk-assign');
        Route::patch('/bulk-update-stage', [LeadController::class, 'bulkUpdateStage'])->name('bulk-update-stage');
        Route::prefix('{lead}/documents')->name('documents.')->group(function () {
            Route::get('/', [LeadDocumentController::class, 'index'])->name('index');
            Route::get('/create', [LeadDocumentController::class, 'create'])->name('create');
            Route::post('/', [LeadDocumentController::class, 'store'])->name('store');
        });
    });

    Route::prefix('lead-documents')->name('lead-documents.')->group(function () {
        Route::get('/{document}', [LeadDocumentController::class, 'show'])->name('show');
        Route::get('/{document}/edit', [LeadDocumentController::class, 'edit'])->name('edit');
        Route::put('/{document}', [LeadDocumentController::class, 'update'])->name('update');
        Route::delete('/{document}', [LeadDocumentController::class, 'destroy'])->name('destroy');
        Route::get('/{document}/download', [LeadDocumentController::class, 'download'])->name('download');
        Route::get('/{document}/preview', [LeadDocumentController::class, 'preview'])->name('preview');
    });

    // ── CRM ───────────────────────────────────────────────────────────────────
    Route::resource('pipelines', PipelineController::class);
    Route::resource('opportunities', OpportunityController::class);
    Route::resource('clients', ClientController::class);
    Route::get('leads/{lead}/convert-to-client', [ClientController::class, 'convertFromLead'])->name('leads.convert-to-client');
    Route::get('opportunities/{opportunity}/convert-to-client', [ClientController::class, 'convertFromOpportunity'])->name('opportunities.convert-to-client');

    Route::resource('contacts', ContactController::class);
    Route::post('contacts/{contact}/regenerate-email', [ContactController::class, 'regenerateEmail'])->name('contacts.regenerate-email');
    Route::post('contacts/{contact}/mark-initial-sent', [ContactController::class, 'markInitialSent'])->name('contacts.mark-initial-sent');
    Route::post('contacts/{contact}/convert-to-lead', [ContactController::class, 'convertToLead'])->name('contacts.convert-to-lead');
    Route::post('contacts/{contact}/follow-ups/{followUp}/send', [ContactController::class, 'sendFollowUp'])->name('contacts.follow-ups.send');
    Route::patch('contacts/{contact}/follow-ups/{followUp}', [ContactController::class, 'updateFollowUp'])->name('contacts.follow-ups.update');

    // ── RFPs / RFQs ────────────────────────────────────────────────────────
    Route::resource('rfps', RfpController::class);
    Route::post('rfps/{rfp}/request-approval', [RfpController::class, 'requestApproval'])->name('rfps.request-approval');
    Route::post('rfps/{rfp}/approve', [RfpController::class, 'approveRequest'])->name('rfps.approve');
    Route::post('rfps/{rfp}/reject', [RfpController::class, 'rejectRequest'])->name('rfps.reject');
    Route::post('rfps/{rfp}/publish', [RfpController::class, 'publish'])->name('rfps.publish');
    Route::post('rfps/{rfp}/close', [RfpController::class, 'close'])->name('rfps.close');
    Route::post('rfps/{rfp}/award', [RfpController::class, 'award'])->name('rfps.award');

    // ── Tenders ───────────────────────────────────────────────────────────────
    Route::resource('tenders', TenderController::class);
    Route::post('tenders/{tender}/reanalyze', [TenderController::class, 'reanalyze'])->name('tenders.reanalyze');
    Route::post('tenders/{tender}/generate-document', [TenderController::class, 'generateDocument'])->name('tenders.generate-document');
    Route::post('tenders/{tender}/chat', [TenderController::class, 'chat'])->name('tenders.chat');
    Route::post('tenders/{tender}/answer-gap', [TenderController::class, 'answerGap'])->name('tenders.answer-gap');
    Route::post('tenders/{tender}/toggle-checklist', [TenderController::class, 'toggleChecklist'])->name('tenders.toggle-checklist');
    Route::post('tenders/{tender}/submit', [TenderController::class, 'submit'])->name('tenders.submit');
    Route::post('tenders/{tender}/won', [TenderController::class, 'markWon'])->name('tenders.won');
    Route::post('tenders/{tender}/lost', [TenderController::class, 'markLost'])->name('tenders.lost');
    Route::post('tenders/{tender}/convert-to-project', [TenderController::class, 'convertToProject'])->name('tenders.convert-to-project');
    Route::post('tenders/{tender}/create-lead', [TenderController::class, 'createLeadAndOpportunity'])->name('tenders.create-lead');
    
    // ── Tender maker-checker additions (add to existing tender routes) ──────
    Route::post('tenders/{tender}/request-approval', [TenderController::class, 'requestApproval'])->name('tenders.request-approval');
    Route::post('tenders/{tender}/approve', [TenderController::class, 'approveRequest'])->name('tenders.approve');
    Route::post('tenders/{tender}/reject', [TenderController::class, 'rejectRequest'])->name('tenders.reject');

    // ── Approvals dashboard ────────────────────────────────────────────────
    Route::get('approvals', [ApprovalController::class, 'index'])->name('approvals.index');
    Route::post('approvals/{approvalRequest}/approve', [ApprovalController::class, 'approve'])->name('approvals.approve');
    Route::post('approvals/{approvalRequest}/reject', [ApprovalController::class, 'reject'])->name('approvals.reject');

    // ── Projects ──────────────────────────────────────────────────────────────
    // Static segment must be registered (and the resource constrained) so 'at-risk' is not captured by {project}
    Route::get('projects/at-risk', [ProjectController::class, 'atRisk'])->name('projects.at-risk');
    Route::resource('projects', ProjectController::class)->whereNumber('project');
    Route::post('projects/{project}/status', [ProjectController::class, 'updateStatus'])->name('projects.status');
    Route::post('projects/{project}/advance-phase', [ProjectController::class, 'advancePhase'])->name('projects.advance-phase');
    Route::post('projects/{project}/clone', [ProjectController::class, 'clone'])->name('projects.clone');
    Route::get('projects/{project}/export', [ProjectController::class, 'export'])->name('projects.export');
    Route::post('projects/{project}/members', [ProjectController::class, 'addMember'])->name('projects.members.add');
    Route::delete('projects/{project}/members/{user}', [ProjectController::class, 'removeMember'])->name('projects.members.remove');

    // Milestones (cross-project view + project-scoped CRUD)
    Route::get('milestones', [MilestoneController::class, 'index'])->name('milestones.index');
    Route::get('projects/{project}/milestones/create', [MilestoneController::class, 'create'])->name('milestones.create');
    Route::post('projects/{project}/milestones', [MilestoneController::class, 'store'])->name('milestones.store');
    Route::get('milestones/{milestone}', [MilestoneController::class, 'show'])->name('milestones.show');
    Route::get('milestones/{milestone}/edit', [MilestoneController::class, 'edit'])->name('milestones.edit');
    Route::put('milestones/{milestone}', [MilestoneController::class, 'update'])->name('milestones.update');
    Route::delete('milestones/{milestone}', [MilestoneController::class, 'destroy'])->name('milestones.destroy');
    Route::post('milestones/{milestone}/complete', [MilestoneController::class, 'complete'])->name('milestones.complete');

    // PMBOK Risk / Issue / Change / Stakeholder / Lessons
    Route::post('projects/{project}/risks', [ProjectRiskController::class, 'store'])->name('projects.risks.store');
    Route::put('projects/{project}/risks/{risk}', [ProjectRiskController::class, 'update'])->name('projects.risks.update');
    Route::delete('projects/{project}/risks/{risk}', [ProjectRiskController::class, 'destroy'])->name('projects.risks.destroy');
    Route::post('projects/{project}/risks/{risk}/realize', [ProjectRiskController::class, 'realize'])->name('projects.risks.realize');
    Route::post('projects/{project}/issues', [ProjectIssueController::class, 'store'])->name('projects.issues.store');
    Route::put('projects/{project}/issues/{issue}', [ProjectIssueController::class, 'update'])->name('projects.issues.update');
    Route::delete('projects/{project}/issues/{issue}', [ProjectIssueController::class, 'destroy'])->name('projects.issues.destroy');
    Route::post('projects/{project}/changes', [ProjectChangeController::class, 'store'])->name('projects.changes.store');
    Route::post('projects/{project}/changes/{change}/approve', [ProjectChangeController::class, 'approve'])->name('projects.changes.approve');
    Route::post('projects/{project}/changes/{change}/reject', [ProjectChangeController::class, 'reject'])->name('projects.changes.reject');
    Route::post('projects/{project}/changes/{change}/implement', [ProjectChangeController::class, 'implement'])->name('projects.changes.implement');
    Route::delete('projects/{project}/changes/{change}', [ProjectChangeController::class, 'destroy'])->name('projects.changes.destroy');
    Route::post('projects/{project}/stakeholders', [ProjectStakeholderController::class, 'store'])->name('projects.stakeholders.store');
    Route::put('projects/{project}/stakeholders/{stakeholder}', [ProjectStakeholderController::class, 'update'])->name('projects.stakeholders.update');
    Route::delete('projects/{project}/stakeholders/{stakeholder}', [ProjectStakeholderController::class, 'destroy'])->name('projects.stakeholders.destroy');
    Route::post('projects/{project}/lessons', [ProjectLessonController::class, 'store'])->name('projects.lessons.store');
    Route::put('projects/{project}/lessons/{lesson}', [ProjectLessonController::class, 'update'])->name('projects.lessons.update');
    Route::delete('projects/{project}/lessons/{lesson}', [ProjectLessonController::class, 'destroy'])->name('projects.lessons.destroy');

    // ── Finance ───────────────────────────────────────────────────────────────
    Route::get('accounting', [AccountingController::class, 'index'])->name('accounting.index');

    Route::resource('invoices', InvoiceController::class);
    Route::prefix('invoices')->name('invoices.')->group(function () {
        Route::post('/{invoice}/send', [InvoiceController::class, 'send'])->name('send');
        Route::get('/{invoice}/pdf', [InvoiceController::class, 'downloadPdf'])->name('pdf');   // ← NEW
        Route::post('/{invoice}/payment', [InvoiceController::class, 'recordPayment'])->name('payment');
        Route::post('/{invoice}/cancel', [InvoiceController::class, 'cancel'])->name('cancel');
        Route::post('/{invoice}/etims/submit', [EtimsController::class, 'submitInvoice'])->name('etims.submit');
        Route::post('/etims/bulk-submit', [EtimsController::class, 'bulkSubmit'])->name('etims.bulk-submit');
        Route::get('/{invoice}/etims/status', [EtimsController::class, 'invoiceStatus'])->name('etims.status');
        // WhatsApp / SMS send
        Route::post('/{invoice}/whatsapp', [InvoiceController::class, 'sendWhatsApp'])->name('whatsapp');

        // Payment reminder (overdue invoices)
        Route::post('/{invoice}/reminder', [InvoiceController::class, 'sendReminder'])->name('reminder');

        // M-Pesa STK push initiation
        Route::post('/{invoice}/mpesa-push', [InvoiceController::class, 'initiateMpesaPush'])->name('mpesa-push');
    });

    // ── eTIMS ──────────────────────────────────────────────────────────────
    Route::get('etims/standard-codes', [EtimsController::class, 'standardCodes'])->name('etims.standard-codes');
    Route::get('etims/test-connection', [EtimsController::class, 'testConnection'])->name('etims.test-connection');    

    // ── Payments ──────────────────────────────────────────────────────────────
    Route::resource('payments', PaymentController::class);
    Route::prefix('payments')->name('payments.')->group(function () {
        Route::patch('/{payment}/reconciliation', [PaymentController::class, 'updateReconciliation'])->name('reconciliation');
        Route::patch('/{payment}/link-invoice', [PaymentController::class, 'linkToInvoice'])->name('link-invoice');
    });
    Route::resource('expenses', ExpenseController::class);
    Route::prefix('expenses')->name('expenses.')->group(function () {
        Route::post('/ocr', [ExpenseController::class, 'extractReceipt'])->name('ocr');
        Route::post('/{expense}/ocr-apply', [ExpenseController::class, 'applyOcr'])->name('ocr-apply');
    });

    Route::prefix('accounting/chart')->name('chart-of-accounts.')->group(function () {
        Route::get('/', [ChartOfAccountsController::class, 'index'])->name('index');
        Route::post('/', [ChartOfAccountsController::class, 'store'])->name('store');
        Route::put('/{account}', [ChartOfAccountsController::class, 'update'])->name('update');
        Route::delete('/{account}', [ChartOfAccountsController::class, 'destroy'])->name('destroy');
    });

    Route::prefix('accounting/periods')->name('accounting-periods.')->group(function () {
        Route::get('/', [FinancialReportsController::class, 'periods'])->name('index');
        Route::post('/', [FinancialReportsController::class, 'createPeriods'])->name('create');
        Route::post('/{period}/close', [FinancialReportsController::class, 'closePeriod'])->name('close');
    });

    Route::prefix('accounting/journal')->name('journal-entries.')->group(function () {
        Route::get('/', [JournalEntryController::class, 'index'])->name('index');
        Route::get('/create', [JournalEntryController::class, 'create'])->name('create');
        Route::post('/', [JournalEntryController::class, 'store'])->name('store');
        Route::get('/{journalEntry}', [JournalEntryController::class, 'show'])->name('show');
        Route::post('/{journalEntry}/post', [JournalEntryController::class, 'post'])->name('post');
        Route::post('/{journalEntry}/reverse', [JournalEntryController::class, 'reverse'])->name('reverse');
        Route::post('/post-pending', [JournalEntryController::class, 'postPending'])->name('post-pending');
    });

    Route::prefix('accounting/reports')->name('accounting-reports.')->group(function () {
        Route::get('/trial-balance', [FinancialReportsController::class, 'trialBalance'])->name('trial-balance');
        Route::get('/profit-loss', [FinancialReportsController::class, 'profitAndLoss'])->name('profit-loss');
        Route::get('/balance-sheet', [FinancialReportsController::class, 'balanceSheet'])->name('balance-sheet');
        Route::get('/cash-flows', [FinancialReportsController::class, 'cashFlows'])->name('cash-flows');
    });

    Route::prefix('accounting/fx')->name('exchange-rates.')->group(function () {
        Route::get('/', [FinancialReportsController::class, 'exchangeRates'])->name('index');
        Route::post('/', [FinancialReportsController::class, 'storeExchangeRate'])->name('store');
    });

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

    // ── Supply Chain ──────────────────────────────────────────────────────────
    Route::get('vendors', fn () => redirect()->route('web.suppliers.index'))->name('vendors.index');
    Route::resource('suppliers', SupplierController::class);
    Route::resource('products', ProductController::class);

    Route::resource('purchase-orders', PurchaseOrderController::class);
    Route::post('purchase-orders/{purchaseOrder}/send', [PurchaseOrderController::class, 'send'])->name('purchase-orders.send');
    Route::post('purchase-orders/{purchaseOrder}/confirm', [PurchaseOrderController::class, 'confirm'])->name('purchase-orders.confirm');
    Route::post('purchase-orders/{purchaseOrder}/cancel', [PurchaseOrderController::class, 'cancel'])->name('purchase-orders.cancel');
    Route::post('purchase-orders/{purchaseOrder}/deliveries', [PurchaseOrderController::class, 'createDelivery'])->name('purchase-orders.create-delivery');
    Route::post('purchase-orders/{purchaseOrder}/documents', [PurchaseOrderController::class, 'uploadDocument'])->name('purchase-orders.upload-document');

    Route::get('deliveries', [DeliveryController::class, 'index'])->name('deliveries.index');
    Route::get('deliveries/{delivery}', [DeliveryController::class, 'show'])->name('deliveries.show');
    Route::post('deliveries/{delivery}/dispatch', [DeliveryController::class, 'dispatch'])->name('deliveries.dispatch');
    Route::post('deliveries/{delivery}/deliver', [DeliveryController::class, 'deliver'])->name('deliveries.deliver');
    Route::post('deliveries/{delivery}/reject', [DeliveryController::class, 'reject'])->name('deliveries.reject');
    Route::post('deliveries/{delivery}/documents', [DeliveryController::class, 'uploadDocument'])->name('deliveries.upload-document');
    Route::post('delivery-documents/{document}/approve', [DeliveryController::class, 'approveDocument'])->name('delivery-documents.approve');
    Route::get('deliveries/{delivery}/confirmation-pdf', [DeliveryController::class, 'confirmationPdf'])->name('deliveries.confirmation-pdf');
    Route::get('delivery-confirm/{token}', [DeliveryController::class, 'confirmPage'])->name('deliveries.confirm-page')->withoutMiddleware(['auth', 'verified']);
    Route::post('delivery-confirm/{token}', [DeliveryController::class, 'confirmByToken'])->name('deliveries.confirm-by-token')->withoutMiddleware(['auth', 'verified']);

    // Forex rates endpoint (for JS currency converter)
    Route::get('/forex-rates', [InvoiceController::class, 'forexRates'])->name('forex-rates');

    // ── HR ────────────────────────────────────────────────────────────────────
    Route::get('hr', [HRController::class, 'index'])->name('hr.index');
    Route::get('hr/staff', [HRController::class, 'staff'])->name('hr.staff');
    Route::get('hr/staff/create', [HRController::class, 'create'])->name('hr.staff.create');
    Route::post('hr/staff', [HRController::class, 'store'])->name('hr.staff.store');
    Route::get('hr/staff/{id}', [HRController::class, 'show'])->name('hr.staff.show');
    Route::get('hr/staff/{id}/edit', [HRController::class, 'edit'])->name('hr.staff.edit');
    Route::put('hr/staff/{id}', [HRController::class, 'update'])->name('hr.staff.update');
    Route::get('hr/leave', [HRController::class, 'leave'])->name('hr.leave');
    Route::post('hr/leave/{leave}/approve', [HRController::class, 'approveLeave'])->name('hr.leave.approve');
    Route::post('hr/leave/{leave}/reject', [HRController::class, 'rejectLeave'])->name('hr.leave.reject');
    Route::resource('time-logs', TimeLogController::class);

    // ── User Management (Admin / HR only) ─────────────────────────────────────
    Route::middleware(['role:admin|human resource'])->prefix('users')->name('users.')->group(function () {
        Route::get('/', [UserController::class, 'index'])->name('index');
        Route::get('/create', [UserController::class, 'create'])->name('create');
        Route::post('/', [UserController::class, 'store'])->name('store');
        Route::get('/{user}/edit', [UserController::class, 'edit'])->name('edit');
        Route::put('/{user}', [UserController::class, 'update'])->name('update');
        Route::delete('/{user}', [UserController::class, 'destroy'])->name('destroy');
        Route::post('/{user}/roles', [UserController::class, 'syncRoles'])->name('sync-roles');
        Route::post('/{user}/reset-password', [UserController::class, 'resetPassword'])->name('reset-password');
        Route::post('/{user}/toggle-active', [UserController::class, 'toggleActive'])->name('toggle-active');
    });

    // ═════════════════════════════════════════════════════════════════════════════
    // INVENTORY
    // ═════════════════════════════════════════════════════════════════════════════

    Route::prefix('inventory')->name('inventory.')->group(function () {
        Route::get('/', [InventoryController::class, 'index'])->name('index');
        Route::get('/valuation', [InventoryController::class, 'valuation'])->name('valuation');
        Route::get('/lookup', [InventoryController::class, 'lookup'])->name('lookup');
        Route::get('/products/{product}/movements', [InventoryController::class, 'movements'])->name('movements');
        Route::post('/products/{product}/adjust', [InventoryController::class, 'adjust'])->name('adjust');
    });

    // ═════════════════════════════════════════════════════════════════════════════
    // POINT OF SALE
    // ═════════════════════════════════════════════════════════════════════════════

    Route::prefix('pos')->name('pos.')->group(function () {
        Route::get('/', [PosController::class, 'index'])->name('index');
        Route::post('/checkout', [PosController::class, 'checkout'])->name('checkout');
        Route::post('/mpesa-push', [PosController::class, 'mpesaPush'])->name('mpesa-push');
        Route::get('/receipt/{sale:receipt_number}', [PosController::class, 'receipt'])->name('receipt');
        Route::get('/history', [PosController::class, 'history'])->name('history');
        Route::post('/{sale}/void', [PosController::class, 'void'])->name('void');

        Route::post('/shift/open', [PosController::class, 'openShift'])->name('shift.open');
        Route::post('/shift/{shift}/close', [PosController::class, 'closeShift'])->name('shift.close');
    });

    // ═════════════════════════════════════════════════════════════════════════════
    // CROSS-BORDER TRADE DOCUMENTS
    // ═════════════════════════════════════════════════════════════════════════════

    Route::resource('trade-documents', TradeDocumentController::class)->except(['edit']);

    Route::prefix('trade-documents/{tradeDocument}')->name('trade-documents.')->group(function () {
        Route::post('/submit-certification', [TradeDocumentController::class, 'submitForCertification'])->name('submit-certification');
        Route::post('/certify', [TradeDocumentController::class, 'recordCertification'])->name('certify');
        Route::get('/pdf', [TradeDocumentController::class, 'downloadPdf'])->name('pdf');
    });

    // ═════════════════════════════════════════════════════════════════════════════
    // FIELD AGENTS
    // ═════════════════════════════════════════════════════════════════════════════

    Route::prefix('field-agents')->name('field-agents.')->group(function () {
        Route::get('/', [FieldAgentController::class, 'index'])->name('index');
        Route::get('/create', [FieldAgentController::class, 'create'])->name('create');
        Route::post('/', [FieldAgentController::class, 'store'])->name('store');
        Route::get('/territory-report', [FieldAgentController::class, 'territoryReport'])->name('territory-report');
        Route::get('/{fieldAgent}', [FieldAgentController::class, 'show'])->name('show');
        Route::patch('/{fieldAgent}', [FieldAgentController::class, 'update'])->name('update');

        Route::post('/check-in', [FieldAgentController::class, 'checkIn'])->name('check-in');
        Route::post('/visits/{visit}/check-out', [FieldAgentController::class, 'checkOut'])->name('check-out');
    });
    

    Route::get('my-visits', [FieldAgentController::class, 'myDashboard'])->name('field-agents.my-dashboard');

    // ═════════════════════════════════════════════════════════════════════════════
    // PAYROLL
    // ═════════════════════════════════════════════════════════════════════════════
    
    Route::prefix('payroll')->name('payroll.')->group(function () {
    
        // Dashboard
        Route::get('/', [PayrollController::class, 'index'])->name('index');
    
        // Employees
        Route::get('/employees',             [PayrollController::class, 'employees'])->name('employees');
        Route::get('/employees/create',      [PayrollController::class, 'createEmployee'])->name('employees.create');
        Route::post('/employees',            [PayrollController::class, 'storeEmployee'])->name('employees.store');
        Route::get('/employees/{employee}/edit', [PayrollController::class, 'editEmployee'])->name('employees.edit');
        Route::patch('/employees/{employee}',    [PayrollController::class, 'updateEmployee'])->name('employees.update');
    
        // Payroll runs
        Route::post('/runs',                 [PayrollController::class, 'createRun'])->name('runs.create');
        Route::get('/runs/{payrollRun}',     [PayrollController::class, 'showRun'])->name('run');
        Route::post('/runs/{payrollRun}/compute',    [PayrollController::class, 'computeRun'])->name('runs.compute');
        Route::post('/runs/{payrollRun}/approve',    [PayrollController::class, 'approveRun'])->name('runs.approve');
        Route::post('/runs/{payrollRun}/mark-paid',  [PayrollController::class, 'markRunPaid'])->name('runs.mark-paid');
    
        // Pay calculator (live, returns JSON)
        Route::post('/calculate', [PayrollController::class, 'calculate'])->name('calculate');
    
        // Payslip detail
        Route::get('/payslips/{payslip}', [PayrollController::class, 'payslip'])->name('payslip');
    
        // P9 annual export
        Route::get('/{year}/p9-export', [PayrollController::class, 'p9Export'])->name('p9-export');
    });
    
    // ═════════════════════════════════════════════════════════════════════════════
    // SACCO
    // ═════════════════════════════════════════════════════════════════════════════
    
    Route::prefix('sacco')->name('sacco.')->group(function () {
    
        // Dashboard
        Route::get('/', [SaccoController::class, 'index'])->name('index');
    
        // Member management
        Route::post('/members',              [SaccoController::class, 'enrollMember'])->name('members.enroll');
        Route::get('/members/{saccoMember}', [SaccoController::class, 'memberShow'])->name('members.show');
    
        // Savings operations
        Route::post('/members/{saccoMember}/deposit',  [SaccoController::class, 'deposit'])->name('members.deposit');
        Route::post('/members/{saccoMember}/withdraw', [SaccoController::class, 'withdraw'])->name('members.withdraw');
    
        // Loans
        Route::post('/members/{saccoMember}/loans', [SaccoController::class, 'applyLoan'])->name('loans.apply');
        Route::post('/loans/{saccoLoan}/approve',   [SaccoController::class, 'approveLoan'])->name('loans.approve');
        Route::post('/loans/{saccoLoan}/disburse',  [SaccoController::class, 'disburseLoan'])->name('loans.disburse');
        Route::post('/loans/{saccoLoan}/repayment', [SaccoController::class, 'recordRepayment'])->name('loans.repayment');
    
        // Dividends
        Route::post('/dividends', [SaccoController::class, 'distributeDividend'])->name('dividends.distribute');
    });
    
    // ═════════════════════════════════════════════════════════════════════════════
    // INVOICE FINANCING READINESS
    // ═════════════════════════════════════════════════════════════════════════════
    
    Route::prefix('financing')->name('financing.')->group(function () {
        Route::get('/report', [FinancingController::class, 'report'])->name('report');
        Route::get('/export', [FinancingController::class, 'export'])->name('export');
    });

    // ── Reports & Admin ───────────────────────────────────────────────────────
    Route::get('reports', [ReportsController::class, 'index'])->name('reports.index');
    Route::get('analytics/leads', [LeadAnalyticsController::class, 'getLeadAnalytics'])->name('analytics.leads');
    Route::get('analytics/performance', [LeadAnalyticsController::class, 'getPerformanceMetrics'])->name('analytics.performance');
    Route::get('audit-logs', [AuditLogController::class, 'index'])->name('audit-logs.index');
    Route::resource('activities', ActivityController::class);
    Route::resource('conversations', ConversationController::class);
    Route::get('emails/compose', [EmailController::class, 'compose'])->name('emails.compose');
    Route::resource('emails', EmailController::class)->except(['create', 'edit', 'update']);
});

// ── Public delivery confirmation (no auth) ────────────────────────────────────
// Note: These are also registered inside the auth group above as a fallback.
// Keeping them here ensures they work even if middleware is misconfigured.

require __DIR__ . '/settings.php';

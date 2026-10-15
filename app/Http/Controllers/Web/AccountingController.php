<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Expense;
use App\Models\ClientFollowUp;
use App\Models\ClientReport;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class AccountingController extends Controller
{
    public function index(Request $request)
    {
        // Auto-sync overdue invoices
        Invoice::where('status', 'issued')
            ->whereDate('due_date', '<', now())
            ->update(['status' => 'overdue']);

        $summary = [
            'total_billed'    => Invoice::whereNotIn('status', ['draft', 'cancelled'])->sum('total'),
            'total_collected' => Payment::sum('amount'),
            'total_overdue'   => Invoice::where('status', 'overdue')->sum('total'),
            'total_expenses'  => Expense::sum('amount'),
        ];

        // Monthly revenue for last 6 months
        $monthly = Payment::selectRaw("DATE_FORMAT(paid_at, '%Y-%m') as month, SUM(amount) as total")
            ->whereNotNull('paid_at')
            ->where('paid_at', '>=', now()->subMonths(6))
            ->groupBy('month')
            ->orderBy('month')
            ->get();

        $recentInvoices = Invoice::with('client:id,name,email', 'project:id,name')
            ->orderByDesc('created_at')
            ->limit(8)
            ->get();

        $overdueInvoices = Invoice::with('client:id,name,email')
            ->where('status', 'overdue')
            ->orderBy('due_date')
            ->limit(5)
            ->get();

        $recentPayments = Payment::with('invoice.client:id,name,email')
            ->orderByDesc('paid_at')
            ->limit(5)
            ->get();

        $pendingFollowUps = ClientFollowUp::with('client:id,name,email', 'project:id,name')
            ->whereNull('completed_at')
            ->orderBy('scheduled_at')
            ->limit(5)
            ->get();

        $invoicesByStatus = Invoice::selectRaw('status, COUNT(*) as count, SUM(total) as total')
            ->groupBy('status')
            ->get()
            ->keyBy('status');

        return Inertia::render('accounting/index', compact(
            'summary',
            'monthly',
            'recentInvoices',
            'overdueInvoices',
            'recentPayments',
            'pendingFollowUps',
            'invoicesByStatus'
        ));
    }
}

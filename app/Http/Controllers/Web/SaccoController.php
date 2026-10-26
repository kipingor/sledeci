<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\SaccoAccount;
use App\Models\SaccoLoan;
use App\Models\SaccoMember;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class SaccoController extends Controller
{
    // ── Dashboard ──────────────────────────────────────────────────────────

    public function index(): Response
    {
        $totalSavings = SaccoAccount::where('type', 'savings')->sum('balance');
        $totalLoansOutstanding = SaccoLoan::whereIn('status', ['disbursed', 'repaying'])->sum('outstanding_balance');
        $activeMembers = SaccoMember::where('status', 'active')->count();

        $members = SaccoMember::with('user:id,name,email', 'savingsAccount')
            ->where('status', 'active')
            ->orderBy('member_number')
            ->paginate(20);

        return Inertia::render('sacco/index', compact(
            'members', 'totalSavings', 'totalLoansOutstanding', 'activeMembers'
        ));
    }

    // ── Members ────────────────────────────────────────────────────────────

    public function enrollMember(Request $request)
    {
        $data = $request->validate([
            'user_id' => 'required|exists:users,id|unique:sacco_members,user_id',
            'monthly_contribution' => 'required|numeric|min:0',
            'share_capital' => 'nullable|numeric|min:0',
            'joined_date' => 'required|date',
        ]);

        $count = SaccoMember::count() + 1;
        $member = DB::transaction(function () use ($data, $count) {
            $member = SaccoMember::create([
                ...$data,
                'member_number' => 'SACCO-'.str_pad((string) $count, 4, '0', STR_PAD_LEFT),
                'status' => 'active',
            ]);

            // Open savings and shares accounts
            SaccoAccount::create(['sacco_member_id' => $member->id, 'type' => 'savings',  'balance' => 0]);
            SaccoAccount::create(['sacco_member_id' => $member->id, 'type' => 'shares',   'balance' => $data['share_capital'] ?? 0]);
            SaccoAccount::create(['sacco_member_id' => $member->id, 'type' => 'dividend', 'balance' => 0]);

            return $member;
        });

        return back()->with('success', "Member {$member->member_number} enrolled.");
    }

    // ── Member detail ──────────────────────────────────────────────────────

    public function memberShow(SaccoMember $saccoMember): Response
    {
        $saccoMember->load('user:id,name,email,phone', 'accounts', 'loans');

        $transactions = $saccoMember->accounts()
            ->with('transactions')
            ->get()
            ->flatMap(fn ($a) => $a->transactions)
            ->sortByDesc('transacted_at')
            ->take(30)
            ->values();

        return Inertia::render('sacco/member', [
            'member' => $saccoMember,
            'transactions' => $transactions,
            'loanLimit' => $saccoMember->loanLimit(),
        ]);
    }

    // ── Deposit ────────────────────────────────────────────────────────────

    public function deposit(Request $request, SaccoMember $saccoMember)
    {
        $data = $request->validate([
            'amount' => 'required|numeric|min:1',
            'reference' => 'nullable|string|max:100',
            'notes' => 'nullable|string',
        ]);

        $account = $saccoMember->savingsAccount;
        if (! $account) {
            $account = SaccoAccount::create(['sacco_member_id' => $saccoMember->id, 'type' => 'savings', 'balance' => 0]);
        }

        $account->applyTransaction((float) $data['amount'], 'deposit', $data['reference'] ?? null, $data['notes'] ?? null);

        return back()->with('success', 'Deposit of KES '.number_format($data['amount'], 2).' recorded.');
    }

    // ── Withdrawal ─────────────────────────────────────────────────────────

    public function withdraw(Request $request, SaccoMember $saccoMember)
    {
        $data = $request->validate([
            'amount' => 'required|numeric|min:1',
            'reference' => 'nullable|string|max:100',
            'notes' => 'required|string|min:5',
        ]);

        $account = $saccoMember->savingsAccount;
        if (! $account || $account->balance < $data['amount']) {
            return back()->with('error', 'Insufficient savings balance.');
        }

        $account->applyTransaction(-(float) $data['amount'], 'withdrawal', $data['reference'] ?? null, $data['notes']);

        return back()->with('success', 'Withdrawal recorded.');
    }

    // ── Loan application ───────────────────────────────────────────────────

    public function applyLoan(Request $request, SaccoMember $saccoMember)
    {
        $data = $request->validate([
            'principal' => 'required|numeric|min:1000',
            'interest_rate' => 'required|numeric|min:1|max:50',
            'term_months' => 'required|integer|min:1|max:60',
            'purpose' => 'required|string|min:10',
        ]);

        $limit = $saccoMember->loanLimit();
        if ($data['principal'] > $limit) {
            return back()->with('error', 'Loan amount exceeds your limit of KES '.number_format($limit, 2).'.');
        }

        $monthly = SaccoLoan::computeMonthlyRepayment($data['principal'], $data['interest_rate'], $data['term_months']);
        $total = round($monthly * $data['term_months'], 2);
        $schedule = SaccoLoan::buildRepaymentSchedule($data['principal'], $data['interest_rate'], $data['term_months'], now()->addMonth()->toDateString());

        $loanCount = SaccoLoan::count() + 1;

        SaccoLoan::create([
            'sacco_member_id' => $saccoMember->id,
            'loan_number' => 'LOAN-'.str_pad((string) $loanCount, 5, '0', STR_PAD_LEFT),
            'principal' => $data['principal'],
            'interest_rate' => $data['interest_rate'],
            'term_months' => $data['term_months'],
            'monthly_repayment' => $monthly,
            'total_repayable' => $total,
            'outstanding_balance' => $data['principal'],
            'status' => 'pending',
            'applied_date' => today(),
            'purpose' => $data['purpose'],
            'repayment_schedule' => $schedule,
        ]);

        return back()->with('success', 'Loan application submitted. Monthly repayment: KES '.number_format($monthly, 2));
    }

    // ── Approve loan ───────────────────────────────────────────────────────

    public function approveLoan(Request $request, SaccoLoan $saccoLoan)
    {
        if ($saccoLoan->status !== 'pending') {
            return back()->with('error', 'Only pending loans can be approved.');
        }

        $saccoLoan->update([
            'status' => 'approved',
            'approved_by' => Auth::id(),
            'approved_date' => today(),
        ]);

        return back()->with('success', 'Loan approved.');
    }

    // ── Disburse loan ──────────────────────────────────────────────────────

    public function disburseLoan(SaccoLoan $saccoLoan)
    {
        if ($saccoLoan->status !== 'approved') {
            return back()->with('error', 'Only approved loans can be disbursed.');
        }

        DB::transaction(function () use ($saccoLoan) {
            $saccoLoan->update([
                'status' => 'disbursed',
                'disbursed_date' => today(),
                'expected_end_date' => today()->addMonths($saccoLoan->term_months),
            ]);

            // Credit member's savings account with loan amount
            $account = $saccoLoan->member->savingsAccount;
            $account->applyTransaction(
                (float) $saccoLoan->principal,
                'loan_disbursement',
                $saccoLoan->loan_number,
                "Loan {$saccoLoan->loan_number} disbursed"
            );
        });

        return back()->with('success', 'Loan disbursed.');
    }

    // ── Record loan repayment ──────────────────────────────────────────────

    public function recordRepayment(Request $request, SaccoLoan $saccoLoan)
    {
        $data = $request->validate([
            'amount' => 'required|numeric|min:1',
            'reference' => 'nullable|string|max:100',
        ]);

        DB::transaction(function () use ($saccoLoan, $data) {
            $newBalance = max(0, (float) $saccoLoan->outstanding_balance - (float) $data['amount']);
            $status = $newBalance <= 0 ? 'settled' : 'repaying';

            $saccoLoan->update(['outstanding_balance' => $newBalance, 'status' => $status]);

            // Debit savings account
            $account = $saccoLoan->member->savingsAccount;
            $account->applyTransaction(
                -(float) $data['amount'],
                'loan_repayment',
                $data['reference'] ?? $saccoLoan->loan_number,
                "Repayment for {$saccoLoan->loan_number}"
            );
        });

        return back()->with('success', 'Repayment recorded.');
    }

    // ── Dividend distribution ──────────────────────────────────────────────

    public function distributeDividend(Request $request)
    {
        $data = $request->validate([
            'total_dividend' => 'required|numeric|min:1',
            'reference' => 'nullable|string',
        ]);

        $totalSavings = SaccoAccount::where('type', 'savings')->sum('balance');
        if ($totalSavings <= 0) {
            return back()->with('error', 'No savings to distribute against.');
        }

        $members = SaccoMember::with('accounts')->where('status', 'active')->get();
        $rate = (float) $data['total_dividend'] / (float) $totalSavings;

        DB::transaction(function () use ($members, $rate, $data) {
            foreach ($members as $member) {
                $savings = (float) $member->savingsAccount?->balance;
                $dividend = round($savings * $rate, 2);
                if ($dividend <= 0) {
                    continue;
                }

                $divAccount = $member->accounts->where('type', 'dividend')->first();
                $divAccount?->applyTransaction($dividend, 'dividend_credit', $data['reference'] ?? null, 'Annual dividend');
            }
        });

        return back()->with('success', 'Dividends distributed.');
    }
}

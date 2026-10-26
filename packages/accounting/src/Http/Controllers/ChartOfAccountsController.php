<?php

namespace Sledeci\Accounting\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Sledeci\Accounting\Models\ChartOfAccount;
use Sledeci\Core\Http\Controller;

class ChartOfAccountsController extends Controller
{
    public function index(): Response
    {
        $accounts = ChartOfAccount::with('parent')
            ->orderBy('sort_order')
            ->orderBy('code')
            ->get()
            ->map(fn ($a) => [
                'id' => $a->id,
                'code' => $a->code,
                'name' => $a->name,
                'type' => $a->type,
                'sub_type' => $a->sub_type,
                'normal_balance' => $a->normal_balance,
                'parent_code' => $a->parent?->code,
                'is_bank' => $a->is_bank_account,
                'is_ar' => $a->is_ar_account,
                'is_system' => $a->is_system,
                'is_active' => $a->is_active,
            ]);

        return Inertia::render('accounting/chart-of-accounts', [
            'accounts' => $accounts,
            'types' => ['asset', 'liability', 'equity', 'revenue', 'expense', 'cogs', 'other_income', 'other_expense'],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'code' => 'required|string|max:20|unique:chart_of_accounts',
            'name' => 'required|string|max:100',
            'type' => 'required|in:asset,liability,equity,revenue,expense,cogs,other_income,other_expense',
            'sub_type' => 'required|string',
            'normal_balance' => 'required|in:debit,credit',
            'parent_id' => 'nullable|exists:chart_of_accounts,id',
            'description' => 'nullable|string',
            'is_bank_account' => 'boolean',
            'is_cash_account' => 'boolean',
            'currency_code' => 'nullable|string|size:3',
        ]);

        ChartOfAccount::create($data);

        return back()->with('success', "Account {$data['code']} — {$data['name']} created.");
    }

    public function update(Request $request, ChartOfAccount $account): RedirectResponse
    {
        if ($account->is_system) {
            return back()->with('error', 'System accounts cannot be modified.');
        }

        $data = $request->validate([
            'name' => 'required|string|max:100',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
            'parent_id' => 'nullable|exists:chart_of_accounts,id',
        ]);

        $account->update($data);

        return back()->with('success', 'Account updated.');
    }

    public function destroy(ChartOfAccount $account): RedirectResponse
    {
        if ($account->is_system) {
            return back()->with('error', 'System accounts cannot be deleted.');
        }

        if ($account->journalLines()->exists()) {
            return back()->with('error', 'Account has transactions. Archive it instead of deleting.');
        }

        $account->delete();

        return back()->with('success', 'Account deleted.');
    }
}

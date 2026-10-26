<?php

namespace Database\Seeders;

use Sledeci\Accounting\Models\ChartOfAccount;
use Illuminate\Database\Seeder;

/**
 * ChartOfAccountsSeeder
 *
 * Seeds a standard IFRS-aligned Chart of Accounts.
 * Account code structure:
 *   1000-1999  Current Assets
 *   2000-2999  Non-Current Assets
 *   3000-3999  Current Liabilities
 *   4000-4999  Non-Current Liabilities
 *   5000-5999  Equity
 *   6000-6999  Revenue
 *   7000-7999  Cost of Sales
 *   8000-8999  Operating Expenses
 *   9000-9999  Other Income / Other Expense / Tax
 *
 * Run with: php artisan db:seed --class=ChartOfAccountsSeeder
 * Or add to DatabaseSeeder: $this->call(ChartOfAccountsSeeder::class);
 */
class ChartOfAccountsSeeder extends Seeder
{
    public function run(): void
    {
        // Disable timestamps for bulk insert speed
        ChartOfAccount::unguard();

        collect($this->accounts())->each(function ($account) {
            ChartOfAccount::firstOrCreate(
                ['code' => $account['code']],
                $account
            );
        });

        // Set parent relationships (second pass, after all records created)
        foreach ($this->parentRelationships() as [$childCode, $parentCode]) {
            $parent = ChartOfAccount::where('code', $parentCode)->first();
            $child  = ChartOfAccount::where('code', $childCode)->first();
            if ($parent && $child) {
                $child->update(['parent_id' => $parent->id]);
            }
        }
    }

    private function accounts(): array
    {
        return [
            // ── CURRENT ASSETS (1000-1499) ─────────────────────────────────────
            ['code' => '1000', 'name' => 'Current Assets',            'type' => 'asset',     'sub_type' => 'other_current_asset',   'normal_balance' => 'debit',  'is_system' => true,  'sort_order' => 100],
            ['code' => '1010', 'name' => 'Cash on Hand',              'type' => 'asset',     'sub_type' => 'cash',                  'normal_balance' => 'debit',  'is_cash_account' => true,  'sort_order' => 101],
            ['code' => '1020', 'name' => 'Bank Account — Main',       'type' => 'asset',     'sub_type' => 'bank',                  'normal_balance' => 'debit',  'is_bank_account' => true,  'sort_order' => 102],
            ['code' => '1021', 'name' => 'Bank Account — USD',        'type' => 'asset',     'sub_type' => 'bank',                  'normal_balance' => 'debit',  'is_bank_account' => true,  'is_foreign_currency' => true, 'currency_code' => 'USD', 'sort_order' => 103],
            ['code' => '1022', 'name' => 'Mobile Money (M-Pesa)',     'type' => 'asset',     'sub_type' => 'cash',                  'normal_balance' => 'debit',  'is_cash_account' => true,  'sort_order' => 104],
            ['code' => '1100', 'name' => 'Accounts Receivable',       'type' => 'asset',     'sub_type' => 'accounts_receivable',   'normal_balance' => 'debit',  'is_ar_account' => true, 'is_system' => true, 'sort_order' => 110],
            ['code' => '1101', 'name' => 'Allowance for Doubtful Accounts', 'type' => 'asset', 'sub_type' => 'accounts_receivable', 'normal_balance' => 'credit', 'is_system' => true,  'sort_order' => 111, 'description' => 'Contra-asset: IAS 39 / IFRS 9 impairment provision'],
            ['code' => '1200', 'name' => 'Prepaid Expenses',          'type' => 'asset',     'sub_type' => 'prepaid',               'normal_balance' => 'debit',  'sort_order' => 120],
            ['code' => '1210', 'name' => 'Prepaid Insurance',         'type' => 'asset',     'sub_type' => 'prepaid',               'normal_balance' => 'debit',  'sort_order' => 121],
            ['code' => '1220', 'name' => 'Prepaid Rent',              'type' => 'asset',     'sub_type' => 'prepaid',               'normal_balance' => 'debit',  'sort_order' => 122],
            ['code' => '1300', 'name' => 'Inventory',                 'type' => 'asset',     'sub_type' => 'inventory',             'normal_balance' => 'debit',  'sort_order' => 130],
            ['code' => '1400', 'name' => 'VAT Receivable (Input VAT)', 'type' => 'asset',    'sub_type' => 'other_current_asset',   'normal_balance' => 'debit',  'is_tax_account' => true, 'sort_order' => 140],
            ['code' => '1410', 'name' => 'Other Current Assets',      'type' => 'asset',     'sub_type' => 'other_current_asset',   'normal_balance' => 'debit',  'sort_order' => 141],

            // ── NON-CURRENT ASSETS (2000-2999) ────────────────────────────────
            ['code' => '2000', 'name' => 'Non-Current Assets',        'type' => 'asset',     'sub_type' => 'other_non_current_asset', 'normal_balance' => 'debit', 'is_system' => true, 'sort_order' => 200],
            ['code' => '2100', 'name' => 'Property, Plant & Equipment', 'type' => 'asset',   'sub_type' => 'fixed_asset',           'normal_balance' => 'debit',  'sort_order' => 210, 'description' => 'IAS 16'],
            ['code' => '2110', 'name' => 'Office Equipment',          'type' => 'asset',     'sub_type' => 'fixed_asset',           'normal_balance' => 'debit',  'sort_order' => 211],
            ['code' => '2120', 'name' => 'Computer Equipment',        'type' => 'asset',     'sub_type' => 'fixed_asset',           'normal_balance' => 'debit',  'sort_order' => 212],
            ['code' => '2130', 'name' => 'Vehicles',                  'type' => 'asset',     'sub_type' => 'fixed_asset',           'normal_balance' => 'debit',  'sort_order' => 213],
            ['code' => '2190', 'name' => 'Accumulated Depreciation — PP&E', 'type' => 'asset', 'sub_type' => 'accumulated_depreciation', 'normal_balance' => 'credit', 'sort_order' => 219, 'description' => 'Contra-asset: IAS 16'],
            ['code' => '2200', 'name' => 'Intangible Assets',         'type' => 'asset',     'sub_type' => 'intangible',            'normal_balance' => 'debit',  'sort_order' => 220, 'description' => 'IAS 38'],
            ['code' => '2210', 'name' => 'Software & Licences',       'type' => 'asset',     'sub_type' => 'intangible',            'normal_balance' => 'debit',  'sort_order' => 221],
            ['code' => '2290', 'name' => 'Accumulated Amortisation — Intangibles', 'type' => 'asset', 'sub_type' => 'accumulated_depreciation', 'normal_balance' => 'credit', 'sort_order' => 229],
            ['code' => '2300', 'name' => 'Long-term Investments',     'type' => 'asset',     'sub_type' => 'other_non_current_asset', 'normal_balance' => 'debit', 'sort_order' => 230, 'description' => 'IFRS 9'],
            ['code' => '2400', 'name' => 'Deferred Tax Asset',        'type' => 'asset',     'sub_type' => 'other_non_current_asset', 'normal_balance' => 'debit', 'sort_order' => 240, 'description' => 'IAS 12'],

            // ── CURRENT LIABILITIES (3000-3999) ───────────────────────────────
            ['code' => '3000', 'name' => 'Current Liabilities',       'type' => 'liability', 'sub_type' => 'other_liability',       'normal_balance' => 'credit', 'is_system' => true, 'sort_order' => 300],
            ['code' => '3100', 'name' => 'Accounts Payable',          'type' => 'liability', 'sub_type' => 'accounts_payable',      'normal_balance' => 'credit', 'is_ap_account' => true, 'is_system' => true, 'sort_order' => 310],
            ['code' => '3200', 'name' => 'Accrued Liabilities',       'type' => 'liability', 'sub_type' => 'accrued_liability',     'normal_balance' => 'credit', 'sort_order' => 320],
            ['code' => '3210', 'name' => 'Accrued Salaries',          'type' => 'liability', 'sub_type' => 'accrued_liability',     'normal_balance' => 'credit', 'sort_order' => 321],
            ['code' => '3300', 'name' => 'Deferred Revenue',          'type' => 'liability', 'sub_type' => 'deferred_revenue',      'normal_balance' => 'credit', 'sort_order' => 330, 'description' => 'IFRS 15: performance obligations not yet satisfied'],
            ['code' => '3400', 'name' => 'VAT Payable (Output VAT)',  'type' => 'liability', 'sub_type' => 'tax_payable',           'normal_balance' => 'credit', 'is_tax_account' => true, 'sort_order' => 340],
            ['code' => '3410', 'name' => 'Withholding Tax Payable',   'type' => 'liability', 'sub_type' => 'tax_payable',           'normal_balance' => 'credit', 'is_tax_account' => true, 'sort_order' => 341],
            ['code' => '3420', 'name' => 'Income Tax Payable',        'type' => 'liability', 'sub_type' => 'tax_payable',           'normal_balance' => 'credit', 'is_tax_account' => true, 'sort_order' => 342],
            ['code' => '3500', 'name' => 'Short-term Borrowings',     'type' => 'liability', 'sub_type' => 'short_term_debt',       'normal_balance' => 'credit', 'sort_order' => 350],
            ['code' => '3600', 'name' => 'Current Portion of Long-term Debt', 'type' => 'liability', 'sub_type' => 'short_term_debt', 'normal_balance' => 'credit', 'sort_order' => 360],

            // ── NON-CURRENT LIABILITIES (4000-4999) ───────────────────────────
            ['code' => '4000', 'name' => 'Non-Current Liabilities',   'type' => 'liability', 'sub_type' => 'other_liability',       'normal_balance' => 'credit', 'is_system' => true, 'sort_order' => 400],
            ['code' => '4100', 'name' => 'Long-term Loans Payable',   'type' => 'liability', 'sub_type' => 'long_term_debt',        'normal_balance' => 'credit', 'sort_order' => 410],
            ['code' => '4200', 'name' => 'Deferred Tax Liability',    'type' => 'liability', 'sub_type' => 'other_liability',       'normal_balance' => 'credit', 'sort_order' => 420, 'description' => 'IAS 12'],

            // ── EQUITY (5000-5999) ─────────────────────────────────────────────
            ['code' => '5000', 'name' => 'Equity',                    'type' => 'equity',    'sub_type' => 'other_equity',          'normal_balance' => 'credit', 'is_system' => true, 'sort_order' => 500],
            ['code' => '5100', 'name' => 'Share Capital',             'type' => 'equity',    'sub_type' => 'share_capital',         'normal_balance' => 'credit', 'sort_order' => 510],
            ['code' => '5200', 'name' => 'Retained Earnings',         'type' => 'equity',    'sub_type' => 'retained_earnings',     'normal_balance' => 'credit', 'is_retained_earnings' => true, 'is_system' => true, 'sort_order' => 520],
            ['code' => '5210', 'name' => 'Current Year Earnings',     'type' => 'equity',    'sub_type' => 'current_earnings',      'normal_balance' => 'credit', 'is_system' => true, 'sort_order' => 521, 'description' => 'Closed to Retained Earnings at year-end'],
            ['code' => '5300', 'name' => 'Other Comprehensive Income', 'type' => 'equity',   'sub_type' => 'other_equity',          'normal_balance' => 'credit', 'sort_order' => 530, 'description' => 'IAS 1: OCI items (FX translation, fair value changes)'],

            // ── REVENUE (6000-6999) ───────────────────────────────────────────
            ['code' => '6000', 'name' => 'Revenue',                   'type' => 'revenue',   'sub_type' => 'operating_revenue',     'normal_balance' => 'credit', 'is_system' => true, 'sort_order' => 600],
            ['code' => '6100', 'name' => 'Service Revenue',           'type' => 'revenue',   'sub_type' => 'operating_revenue',     'normal_balance' => 'credit', 'is_system' => true, 'sort_order' => 610, 'description' => 'IFRS 15: recognised when performance obligation satisfied'],
            ['code' => '6110', 'name' => 'Consulting Revenue',        'type' => 'revenue',   'sub_type' => 'operating_revenue',     'normal_balance' => 'credit', 'sort_order' => 611],
            ['code' => '6120', 'name' => 'Software / Licence Revenue', 'type' => 'revenue',  'sub_type' => 'operating_revenue',     'normal_balance' => 'credit', 'sort_order' => 612],
            ['code' => '6130', 'name' => 'Project Revenue',           'type' => 'revenue',   'sub_type' => 'operating_revenue',     'normal_balance' => 'credit', 'sort_order' => 613],
            ['code' => '6200', 'name' => 'Product / Goods Revenue',   'type' => 'revenue',   'sub_type' => 'operating_revenue',     'normal_balance' => 'credit', 'sort_order' => 620],
            ['code' => '6300', 'name' => 'Interest Income',           'type' => 'revenue',   'sub_type' => 'interest_income',       'normal_balance' => 'credit', 'sort_order' => 630, 'description' => 'IFRS 9'],
            ['code' => '6400', 'name' => 'Foreign Exchange Gain',     'type' => 'revenue',   'sub_type' => 'fx_gain',               'normal_balance' => 'credit', 'sort_order' => 640, 'description' => 'IAS 21.28'],
            ['code' => '6500', 'name' => 'Other Income',              'type' => 'other_income', 'sub_type' => 'other',             'normal_balance' => 'credit', 'sort_order' => 650],

            // ── COST OF SALES (7000-7999) ─────────────────────────────────────
            ['code' => '7000', 'name' => 'Cost of Sales',             'type' => 'cogs',      'sub_type' => 'cost_of_sales',         'normal_balance' => 'debit',  'is_system' => true, 'sort_order' => 700],
            ['code' => '7100', 'name' => 'Cost of Services',          'type' => 'cogs',      'sub_type' => 'cost_of_sales',         'normal_balance' => 'debit',  'sort_order' => 710],
            ['code' => '7200', 'name' => 'Cost of Goods Sold',        'type' => 'cogs',      'sub_type' => 'cost_of_sales',         'normal_balance' => 'debit',  'sort_order' => 720],
            ['code' => '7300', 'name' => 'Direct Labour',             'type' => 'cogs',      'sub_type' => 'cost_of_sales',         'normal_balance' => 'debit',  'sort_order' => 730],
            ['code' => '7400', 'name' => 'Subcontractor Costs',       'type' => 'cogs',      'sub_type' => 'cost_of_sales',         'normal_balance' => 'debit',  'sort_order' => 740],

            // ── OPERATING EXPENSES (8000-8999) ────────────────────────────────
            ['code' => '8000', 'name' => 'Operating Expenses',        'type' => 'expense',   'sub_type' => 'operating_expense',     'normal_balance' => 'debit',  'is_system' => true, 'sort_order' => 800],
            ['code' => '8100', 'name' => 'Salaries & Wages',          'type' => 'expense',   'sub_type' => 'operating_expense',     'normal_balance' => 'debit',  'sort_order' => 810],
            ['code' => '8110', 'name' => 'PAYE / Payroll Tax',        'type' => 'expense',   'sub_type' => 'operating_expense',     'normal_balance' => 'debit',  'sort_order' => 811],
            ['code' => '8120', 'name' => 'Employee Benefits',         'type' => 'expense',   'sub_type' => 'operating_expense',     'normal_balance' => 'debit',  'sort_order' => 812],
            ['code' => '8200', 'name' => 'Rent & Rates',              'type' => 'expense',   'sub_type' => 'operating_expense',     'normal_balance' => 'debit',  'sort_order' => 820],
            ['code' => '8210', 'name' => 'Utilities',                 'type' => 'expense',   'sub_type' => 'operating_expense',     'normal_balance' => 'debit',  'sort_order' => 821],
            ['code' => '8300', 'name' => 'Marketing & Advertising',   'type' => 'expense',   'sub_type' => 'operating_expense',     'normal_balance' => 'debit',  'sort_order' => 830],
            ['code' => '8400', 'name' => 'Professional Fees',         'type' => 'expense',   'sub_type' => 'operating_expense',     'normal_balance' => 'debit',  'sort_order' => 840],
            ['code' => '8410', 'name' => 'Legal Fees',                'type' => 'expense',   'sub_type' => 'operating_expense',     'normal_balance' => 'debit',  'sort_order' => 841],
            ['code' => '8420', 'name' => 'Audit & Accounting Fees',   'type' => 'expense',   'sub_type' => 'operating_expense',     'normal_balance' => 'debit',  'sort_order' => 842],
            ['code' => '8500', 'name' => 'Travel & Entertainment',    'type' => 'expense',   'sub_type' => 'operating_expense',     'normal_balance' => 'debit',  'sort_order' => 850],
            ['code' => '8600', 'name' => 'Depreciation Expense',      'type' => 'expense',   'sub_type' => 'depreciation_expense',  'normal_balance' => 'debit',  'sort_order' => 860, 'description' => 'IAS 16'],
            ['code' => '8610', 'name' => 'Amortisation Expense',      'type' => 'expense',   'sub_type' => 'depreciation_expense',  'normal_balance' => 'debit',  'sort_order' => 861, 'description' => 'IAS 38'],
            ['code' => '8700', 'name' => 'Bad Debt Expense',          'type' => 'expense',   'sub_type' => 'operating_expense',     'normal_balance' => 'debit',  'sort_order' => 870, 'description' => 'IFRS 9 impairment'],
            ['code' => '8800', 'name' => 'Bank Charges & Fees',       'type' => 'expense',   'sub_type' => 'operating_expense',     'normal_balance' => 'debit',  'sort_order' => 880],
            ['code' => '8900', 'name' => 'General & Administrative',  'type' => 'expense',   'sub_type' => 'operating_expense',     'normal_balance' => 'debit',  'sort_order' => 890],
            ['code' => '8910', 'name' => 'Office Supplies',           'type' => 'expense',   'sub_type' => 'operating_expense',     'normal_balance' => 'debit',  'sort_order' => 891],
            ['code' => '8920', 'name' => 'Telecommunications',        'type' => 'expense',   'sub_type' => 'operating_expense',     'normal_balance' => 'debit',  'sort_order' => 892],
            ['code' => '8930', 'name' => 'Subscriptions & Software',  'type' => 'expense',   'sub_type' => 'operating_expense',     'normal_balance' => 'debit',  'sort_order' => 893],

            // ── OTHER / FINANCE (9000-9999) ───────────────────────────────────
            ['code' => '9100', 'name' => 'Interest Expense',          'type' => 'other_expense', 'sub_type' => 'interest_expense',  'normal_balance' => 'debit',  'sort_order' => 910, 'description' => 'IFRS 9'],
            ['code' => '9200', 'name' => 'Foreign Exchange Loss',     'type' => 'other_expense', 'sub_type' => 'fx_loss',           'normal_balance' => 'debit',  'sort_order' => 920, 'description' => 'IAS 21.28'],
            ['code' => '9300', 'name' => 'Income Tax Expense',        'type' => 'other_expense', 'sub_type' => 'tax_expense',       'normal_balance' => 'debit',  'sort_order' => 930, 'description' => 'IAS 12: current + deferred'],
            ['code' => '9400', 'name' => 'Impairment Losses',         'type' => 'other_expense', 'sub_type' => 'other',             'normal_balance' => 'debit',  'sort_order' => 940, 'description' => 'IAS 36'],
        ];
    }

    /**
     * Parent-child relationships for account hierarchy.
     * [child_code, parent_code]
     */
    private function parentRelationships(): array
    {
        return [
            // Current Assets children
            ['1010', '1000'], ['1020', '1000'], ['1021', '1000'], ['1022', '1000'],
            ['1100', '1000'], ['1101', '1100'], ['1200', '1000'], ['1210', '1200'],
            ['1220', '1200'], ['1300', '1000'], ['1400', '1000'], ['1410', '1000'],
            // Non-current Assets children
            ['2100', '2000'], ['2110', '2100'], ['2120', '2100'], ['2130', '2100'],
            ['2190', '2100'], ['2200', '2000'], ['2210', '2200'], ['2290', '2200'],
            ['2300', '2000'], ['2400', '2000'],
            // Current Liabilities children
            ['3100', '3000'], ['3200', '3000'], ['3210', '3200'], ['3300', '3000'],
            ['3400', '3000'], ['3410', '3000'], ['3420', '3000'], ['3500', '3000'],
            ['3600', '3000'],
            // Non-current Liabilities children
            ['4100', '4000'], ['4200', '4000'],
            // Equity children
            ['5100', '5000'], ['5200', '5000'], ['5210', '5000'], ['5300', '5000'],
            // Revenue children
            ['6100', '6000'], ['6110', '6100'], ['6120', '6100'], ['6130', '6100'],
            ['6200', '6000'], ['6300', '6000'], ['6400', '6000'], ['6500', '6000'],
            // CoS children
            ['7100', '7000'], ['7200', '7000'], ['7300', '7000'], ['7400', '7000'],
            // OpEx children
            ['8100', '8000'], ['8110', '8100'], ['8120', '8100'],
            ['8200', '8000'], ['8210', '8200'], ['8300', '8000'],
            ['8400', '8000'], ['8410', '8400'], ['8420', '8400'],
            ['8500', '8000'], ['8600', '8000'], ['8610', '8600'],
            ['8700', '8000'], ['8800', '8000'], ['8900', '8000'],
            ['8910', '8900'], ['8920', '8900'], ['8930', '8900'],
        ];
    }
}

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // ── Chart of Accounts ─────────────────────────────────────────────────
        Schema::create('chart_of_accounts', function (Blueprint $table) {
            $table->id();
            $table->string('code', 20)->unique();       // e.g. 1100, 6001
            $table->string('name');
            $table->string('description')->nullable();
            $table->enum('type', [
                'asset', 'liability', 'equity',
                'revenue', 'expense', 'cogs',
                'other_income', 'other_expense',
            ]);
            $table->enum('sub_type', [
                // Assets
                'cash', 'bank', 'accounts_receivable', 'inventory',
                'prepaid', 'fixed_asset', 'accumulated_depreciation',
                'intangible', 'other_current_asset', 'other_non_current_asset',
                // Liabilities
                'accounts_payable', 'accrued_liability', 'deferred_revenue',
                'tax_payable', 'short_term_debt', 'long_term_debt', 'other_liability',
                // Equity
                'share_capital', 'retained_earnings', 'current_earnings', 'other_equity',
                // Income Statement
                'operating_revenue', 'interest_income', 'fx_gain',
                'cost_of_sales', 'operating_expense', 'depreciation_expense',
                'interest_expense', 'fx_loss', 'tax_expense', 'other',
            ])->default('other');

            // Hierarchy (for sub-accounts, e.g. Bank → USD Account)
            $table->foreignId('parent_id')->nullable()->constrained('chart_of_accounts')->nullOnDelete();

            // Normal balance: 'debit' for assets/expenses, 'credit' for liabilities/equity/revenue
            $table->enum('normal_balance', ['debit', 'credit']);

            // IAS 21: track whether this account holds foreign currency balances
            $table->boolean('is_foreign_currency')->default(false);
            $table->string('currency_code', 3)->nullable();      // e.g. 'USD', 'KES'

            // Account behaviour flags
            $table->boolean('is_bank_account')->default(false);  // appears in Bank Reconciliation
            $table->boolean('is_cash_account')->default(false);  // flows into Cash Flow statement
            $table->boolean('is_ar_account')->default(false);    // Accounts Receivable control
            $table->boolean('is_ap_account')->default(false);    // Accounts Payable control
            $table->boolean('is_tax_account')->default(false);   // VAT/Tax control
            $table->boolean('is_retained_earnings')->default(false); // Year-end close target

            $table->boolean('is_active')->default(true);
            $table->boolean('is_system')->default(false);        // Protected — cannot be deleted
            $table->integer('sort_order')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['type', 'is_active']);
            $table->index(['parent_id']);
            $table->index(['is_bank_account']);
            $table->index(['is_ar_account']);
        });

        // ── Accounting Periods ────────────────────────────────────────────────
        Schema::create('accounting_periods', function (Blueprint $table) {
            $table->id();
            $table->string('name');                    // e.g. "FY2024 Q1", "Jan 2024"
            $table->enum('type', ['month', 'quarter', 'year']);
            $table->integer('fiscal_year');            // e.g. 2024
            $table->tinyInteger('period_number');      // 1-12 for months, 1-4 for quarters
            $table->date('starts_on');
            $table->date('ends_on');
            $table->enum('status', ['open', 'closing', 'closed', 'locked'])->default('open');
            // locked = permanently closed, no changes allowed (audit requirement)
            $table->timestamp('closed_at')->nullable();
            $table->foreignId('closed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->boolean('is_adjustment_period')->default(false); // Period 13 (year-end adjustments)
            $table->timestamps();

            $table->unique(['fiscal_year', 'period_number', 'type']);
            $table->index(['status']);
            $table->index(['starts_on', 'ends_on']);
        });

        // ── Exchange Rates (IAS 21) ───────────────────────────────────────────
        Schema::create('exchange_rates', function (Blueprint $table) {
            $table->id();
            $table->string('from_currency', 3);        // e.g. 'USD'
            $table->string('to_currency', 3);          // e.g. 'KES'
            $table->decimal('rate', 20, 10);           // e.g. 129.50 (1 USD = 129.50 KES)
            $table->enum('rate_type', ['spot', 'average', 'closing'])->default('spot');
            // spot    = transaction date rate (IAS 21.21)
            // average = period average for convenience (IAS 21.22)
            // closing = period-end rate for balance sheet items (IAS 21.23)
            $table->date('rate_date');
            $table->string('source')->nullable();      // e.g. 'CBK', 'manual', 'ECB'
            $table->foreignId('entered_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['from_currency', 'to_currency', 'rate_date']);
            $table->index(['from_currency', 'to_currency', 'rate_date']);
        });

        // ── Tax Codes (IAS 12 / VAT) ──────────────────────────────────────────
        Schema::create('tax_codes', function (Blueprint $table) {
            $table->id();
            $table->string('code', 20)->unique();      // e.g. 'VAT16', 'WHT5', 'EXEMPT'
            $table->string('name');
            $table->enum('type', ['vat', 'withholding', 'income_tax', 'exempt', 'zero_rated', 'payroll', 'excise', 'transfer', 'sales_tax']);
            $table->decimal('rate', 7, 4);             // e.g. 16.00 for 16% VAT
            $table->foreignId('input_account_id')      // VAT Input / Deductible
                ->nullable()->constrained('chart_of_accounts')->nullOnDelete();
            $table->foreignId('output_account_id')     // VAT Output / Payable
                ->nullable()->constrained('chart_of_accounts')->nullOnDelete();
            $table->boolean('is_active')->default(true);
            $table->boolean('is_default')->default(false);
            $table->string('jurisdiction')->nullable(); // e.g. 'KE', 'US', 'EU'
            $table->timestamps();
        });

        // ── Journal Entry Headers ─────────────────────────────────────────────
        Schema::create('journal_entries', function (Blueprint $table) {
            $table->id();

            // Reference number — unique, auto-generated (JE-2024-0001)
            $table->string('reference', 30)->unique();

            // The accounting period this entry belongs to
            $table->foreignId('period_id')
                ->constrained('accounting_periods')
                ->restrictOnDelete();

            $table->date('entry_date');                // Transaction date
            $table->date('posting_date')->nullable();  // Date posted to ledger (may differ)

            $table->enum('type', [
                'invoice',       // AR invoice posted (IFRS 15)
                'payment',       // Cash/bank receipt
                'expense',       // Expense recognition
                'payable',       // AP / vendor bill
                'depreciation',  // Fixed asset depreciation (IAS 16)
                'accrual',       // Accrual entry (IAS 37)
                'prepayment',    // Prepaid expense release
                'fx_revaluation', // Foreign currency revaluation (IAS 21)
                'period_close',  // Period-end closing entry
                'tax',           // Tax provision (IAS 12)
                'manual',        // User-created manual entry
                'reversal',      // Reversal of a prior entry
                'opening',       // Opening balances
            ]);

            $table->string('memo');                    // Required description
            $table->text('notes')->nullable();

            // Functional currency (company base currency)
            $table->string('functional_currency', 3)->default('KES');

            // Source document (polymorphic)
            $table->string('source_type')->nullable(); // App\Models\Invoice, etc.
            $table->unsignedBigInteger('source_id')->nullable();

            // For reversals: link back to original
            $table->foreignId('reversed_by')->nullable()
                ->references('id')->on('journal_entries')
                ->nullOnDelete();
            $table->boolean('is_reversal')->default(false);
            $table->boolean('is_reversed')->default(false); // original was reversed

            $table->enum('status', ['draft', 'posted', 'voided'])->default('draft');
            // draft  = not yet affecting ledger balances
            // posted = immutable, affecting balances
            // voided = cancelled (only draft can be voided)

            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('posted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('posted_at')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['source_type', 'source_id']);
            $table->index(['period_id', 'status']);
            $table->index(['entry_date']);
            $table->index(['type', 'status']);
        });

        // ── Journal Entry Lines (Debit / Credit) ──────────────────────────────
        Schema::create('journal_entry_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('journal_entry_id')
                ->constrained('journal_entries')
                ->cascadeOnDelete();

            $table->foreignId('account_id')
                ->constrained('chart_of_accounts')
                ->restrictOnDelete();

            $table->enum('type', ['debit', 'credit']);

            // ── Functional currency amount (ALWAYS in company base currency) ──
            $table->decimal('amount', 18, 4);          // e.g. 12950.00 KES

            // ── Foreign currency fields (IAS 21) ─────────────────────────────
            $table->string('foreign_currency', 3)->nullable();  // e.g. 'USD'
            $table->decimal('foreign_amount', 18, 4)->nullable(); // e.g. 100.00 USD
            $table->decimal('exchange_rate', 20, 10)->nullable(); // e.g. 129.50

            // Tax line reference
            $table->foreignId('tax_code_id')->nullable()
                ->constrained('tax_codes')->nullOnDelete();
            $table->decimal('tax_amount', 18, 4)->nullable();

            // Description on this specific line (overrides journal memo)
            $table->string('description')->nullable();

            // Cost allocation tags (for management accounting)
            $table->foreignId('project_id')->nullable()
                ->constrained('projects')->nullOnDelete();
            $table->foreignId('client_id')->nullable()
                ->constrained('users')->nullOnDelete();

            $table->unsignedSmallInteger('line_order')->default(0);
            $table->timestamps();

            $table->index(['journal_entry_id']);
            $table->index(['account_id']);
            $table->index(['project_id']);
        });

        Schema::create('expenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->foreignId('entered_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('vendor')->nullable();
            $table->text('description')->nullable();
            $table->decimal('amount', 15, 2);
            $table->string('currency', 3)->default('KES');
            $table->date('incurred_at')->nullable();
            $table->string('receipt_path')->nullable();
            $table->boolean('receipt_pending_upload')->default(false);
            $table->string('receipt_filename_hint')->nullable();
            $table->string('idempotency_key')->nullable()->unique();
            $table->json('lines')->nullable(); // store line items to avoid heavy joins
            $table->text('notes')->nullable();
            $table->foreignId('journal_entry_id')->nullable()->constrained('journal_entries')->nullOnDelete();
            $table->enum('posting_status', ['unposted', 'posted', 'reversed'])->default('unposted');
            $table->foreignId('expense_account_id')->nullable()->constrained('chart_of_accounts')->nullOnDelete();
            $table->foreignId('tax_code_id')->nullable()->constrained('tax_codes')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['project_id']);
            $table->index(['entered_by']);
        });

        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->foreignId('client_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('buyer_kra_pin')->nullable();
            $table->string('buyer_name')->nullable();
            $table->string('number')->unique();
            $table->string('etims_invoice_number')->nullable()->comment('KRA-assigned eTIMS invoice number');
            $table->string('etims_cu_invoice_number')->nullable()->comment('Control Unit invoice number');
            $table->enum('etims_status', ['not_submitted', 'pending', 'submitted', 'accepted', 'rejected', 'cancelled'])->default('not_submitted');
            $table->timestamp('etims_submitted_at')->nullable();
            $table->timestamp('etims_accepted_at')->nullable();
            $table->json('etims_response')->nullable()->comment('Raw eTIMS API response');
            $table->string('etims_qr_url')->nullable()->comment('QR code URL for eTIMS verification');
            $table->date('issue_date')->nullable();
            $table->date('due_date')->nullable();
            $table->decimal('subtotal', 15, 2)->default(0);
            $table->decimal('tax', 15, 2)->default(0);
            $table->decimal('total', 15, 2)->default(0);
            $table->string('currency', 10)->default('USD');
            $table->timestamp('sent_at')->nullable();
            $table->enum('status', ['draft', 'issued', 'paid', 'overdue', 'cancelled'])->default('draft');

            // Maker-checker
            $table->enum('approval_status', ['not_required', 'pending', 'approved', 'rejected'])->default('not_required');
            $table->json('lines')->nullable(); // store line items to avoid heavy joins
            $table->text('notes')->nullable();
            $table->foreignId('journal_entry_id')->nullable()->constrained('journal_entries')->nullOnDelete();

            // IFRS 15: track posting status separately from billing status
            $table->enum('posting_status', ['unposted', 'posted', 'reversed'])->default('unposted');

            // Tax code applied at invoice level
            $table->foreignId('tax_code_id')->nullable()->constrained('tax_codes')->nullOnDelete();

            // IAS 21: store the exchange rate used at invoice date
            $table->decimal('exchange_rate', 20, 10)->nullable();

            // Functional currency equivalent of total (for multi-currency)
            $table->string('functional_currency', 3)->nullable();
            $table->decimal('functional_total', 18, 4)->nullable();
            $table->decimal('forex_gain_loss', 15, 4)->default(0)->comment('Realised FX gain (positive) or loss (negative) in functional currency');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['project_id']);
            $table->index(['client_id']);
            $table->index(['status']);
            $table->index(['posting_status']);
        });

        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->nullable()->constrained('invoices')->nullOnDelete();
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->decimal('amount', 15, 2);
            $table->string('currency', 10)->default('USD');
            $table->decimal('exchange_rate', 18, 8)->nullable()->comment('FX rate at time of payment (invoice currency → functional)');
            $table->string('method')->nullable(); // mpesa, bank, credit_card
            $table->enum('channel', [
                'cash', 'bank', 'mpesa', 'airtel_money', 'mtn_momo',
                'card', 'cheque', 'crypto', 'other',
            ])->default('bank');
            $table->string('mobile_money_code')->nullable()->comment('STK push / USSD transaction code from the telco');
            $table->string('mobile_money_phone')->nullable();
            $table->json('mobile_money_payload')->nullable();
            $table->enum('reconciliation_status', ['pending', 'matched', 'unmatched', 'exception'])->default('pending');
            $table->string('reference')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('journal_entry_id')->nullable()->constrained('journal_entries')->nullOnDelete();
            $table->enum('posting_status', ['unposted', 'posted', 'reversed'])->default('unposted');
            $table->foreignId('bank_account_id')->nullable()->constrained('chart_of_accounts')->nullOnDelete();
            $table->decimal('functional_amount', 15, 4)->nullable()->comment('Payment amount converted to functional currency');
            $table->timestamp('paid_at')->nullable();
            $table->foreignId('received_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index('invoice_id');
            $table->index('project_id');
            $table->unique('mobile_money_code');  // one payment per telco receipt (NULLs allowed)
            $table->index('reconciliation_status');
        });

        Schema::create('forex_rates', function (Blueprint $table) {
            $table->id();
            $table->string('base_currency', 3)->default('KES');
            $table->string('quote_currency', 3);
            $table->decimal('rate', 18, 8)->comment('1 base = rate quote');
            $table->decimal('rate_buy', 18, 8)->nullable()->comment('Bank buy rate');
            $table->decimal('rate_sell', 18, 8)->nullable()->comment('Bank sell rate');
            $table->string('source')->default('exchangerate-api')
                ->comment('Provider: exchangerate-api | cbk | manual');
            $table->timestamp('fetched_at');
            $table->timestamps();

            $table->index(['base_currency', 'quote_currency', 'fetched_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('forex_rates');
        Schema::dropIfExists('payments');
        Schema::dropIfExists('invoices');
        Schema::dropIfExists('expenses');
        Schema::dropIfExists('journal_entry_lines');
        Schema::dropIfExists('journal_entries');
        Schema::dropIfExists('tax_codes');
        Schema::dropIfExists('exchange_rates');
        Schema::dropIfExists('accounting_periods');
        Schema::dropIfExists('chart_of_accounts');
    }
};

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
        // ── 1. SACCO members ───────────────────────────────────────────────
        Schema::create('sacco_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('member_number')->unique();
            $table->date('joined_date');
            $table->decimal('share_capital', 15, 2)->default(0)
                ->comment('One-time or instalment shares paid on joining');
            $table->decimal('monthly_contribution', 15, 2)->default(0)
                ->comment('Required monthly savings deposit');
            $table->enum('status', ['active', 'suspended', 'withdrawn', 'deceased'])
                ->default('active');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        // ── 2. SACCO accounts ──────────────────────────────────────────────
        Schema::create('sacco_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sacco_member_id')->constrained('sacco_members')->cascadeOnDelete();
            $table->enum('type', ['savings', 'loan', 'shares', 'dividend'])
                ->default('savings');
            $table->decimal('balance', 15, 2)->default(0);
            $table->string('currency', 3)->default('KES');
            $table->boolean('active')->default(true);
            $table->timestamps();
            $table->unique(['sacco_member_id', 'type']);
        });
 
        // ── 3. SACCO transactions ──────────────────────────────────────────
        Schema::create('sacco_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sacco_account_id')->constrained('sacco_accounts')->cascadeOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
 
            $table->enum('type', [
                'deposit', 'withdrawal', 'loan_disbursement', 'loan_repayment',
                'interest_credit', 'dividend_credit', 'share_purchase',
                'charge', 'reversal',
            ]);
            $table->decimal('amount', 15, 2);
            $table->decimal('balance_after', 15, 2);
            $table->string('reference')->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('transacted_at')->useCurrent();
            $table->timestamps();
 
            $table->index(['sacco_account_id', 'transacted_at']);
        });
 
        // ── 4. SACCO loans ─────────────────────────────────────────────────
        Schema::create('sacco_loans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sacco_member_id')->constrained('sacco_members')->cascadeOnDelete();
            $table->string('loan_number')->unique();
 
            $table->decimal('principal', 15, 2);
            $table->decimal('interest_rate', 5, 2)->comment('Annual % rate');
            $table->unsignedSmallInteger('term_months');
            $table->decimal('monthly_repayment', 15, 2)->comment('Computed instalment');
            $table->decimal('total_repayable', 15, 2);
            $table->decimal('outstanding_balance', 15, 2);
 
            $table->enum('status', ['pending', 'approved', 'disbursed', 'repaying', 'settled', 'defaulted'])
                ->default('pending');
            $table->date('applied_date');
            $table->date('approved_date')->nullable();
            $table->date('disbursed_date')->nullable();
            $table->date('expected_end_date')->nullable();
 
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('purpose')->nullable();
            $table->json('repayment_schedule')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        schema::dropIfExists('sacco_loans');
        schema::dropIfExists('sacco_transactions');
        schema::dropIfExists('sacco_accounts');
        Schema::dropIfExists('sacco_members');
    }
};

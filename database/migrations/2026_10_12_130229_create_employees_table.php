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
        Schema::create('employees', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();

            $table->string('employee_number')->unique();
            $table->string('first_name');
            $table->string('last_name');
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->string('id_number')->nullable()->comment('National ID / Passport');
            $table->string('kra_pin')->nullable()->comment('Personal KRA PIN for PAYE');
            $table->string('nssf_number')->nullable();
            $table->string('nhif_number')->nullable();

            $table->enum('employment_type', ['full_time', 'part_time', 'contract', 'casual'])->default('full_time');
            $table->string('department')->nullable();
            $table->string('job_title')->nullable();
            $table->date('hire_date');
            $table->date('termination_date')->nullable();
            $table->boolean('active')->default(true);

            // Compensation
            $table->decimal('basic_salary', 15, 2)->default(0)->comment('Gross basic salary per month');
            $table->decimal('house_allowance', 15, 2)->default(0);
            $table->decimal('transport_allowance', 15, 2)->default(0);
            $table->decimal('other_allowances', 15, 2)->default(0);
            $table->string('currency', 3)->default('KES');
            $table->enum('pay_frequency', ['monthly', 'bi_weekly', 'weekly'])->default('monthly');

            // Bank details for netsalary transfer
            $table->string('bank_name')->nullable();
            $table->string('bank_account_number')->nullable();
            $table->string('bank_branch')->nullable();
            $table->string('mpesa_phone')->nullable()->comment('Fallback mobile money disbursement');

            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['active', 'employment_type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('employees');
    }
};

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
        Schema::create('payslips', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payroll_run_id')->constrained('payroll_runs')->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();

            // Earnings
            $table->decimal('basic_salary', 15, 2);
            $table->decimal('house_allowance', 15, 2)->default(0);
            $table->decimal('transport_allowance', 15, 2)->default(0);
            $table->decimal('other_allowances', 15, 2)->default(0);
            $table->decimal('gross_pay', 15, 2);

            // Statutory deductions (Kenya-specific)
            $table->decimal('paye', 15, 2)->default(0)
                ->comment('Pay As You Earn income tax — KRA brackets');
            $table->decimal('nhif', 15, 2)->default(0)
                ->comment('National Hospital Insurance Fund — tiered by gross');
            $table->decimal('nssf_employee', 15, 2)->default(0)
                ->comment('Employee NSSF contribution — 6% of pensionable pay, max KES 720');
            $table->decimal('nssf_employer', 15, 2)->default(0)
                ->comment('Employer NSSF contribution — equal to employee');
            $table->decimal('housing_levy', 15, 2)->default(0)
                ->comment('Affordable Housing Levy — 1.5% of gross (employee + employer match)');
            $table->decimal('helb', 15, 2)->default(0)
                ->comment('Higher Education Loans Board repayment');

            // Other deductions (loans, salary advance, SACCO)
            $table->decimal('other_deductions', 15, 2)->default(0);
            $table->decimal('total_deductions', 15, 2);
            $table->decimal('net_pay', 15, 2);

            $table->enum('payment_status', ['pending', 'paid', 'failed'])->default('pending');
            $table->string('payment_reference')->nullable();
            $table->timestamp('paid_at')->nullable();

            $table->timestamps();
            $table->unique(['payroll_run_id', 'employee_id']);
        });

        Schema::create('payslip_deductions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payslip_id')->constrained('payslips')->cascadeOnDelete();
            $table->string('name');
            $table->string('type')->comment('statutory | loan | advance | sacco | other');
            $table->decimal('amount', 15, 2);
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payslip_deductions');
        Schema::dropIfExists('payslips');
    }
};

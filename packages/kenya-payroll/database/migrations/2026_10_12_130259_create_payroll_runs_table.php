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
        Schema::create('payroll_runs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
 
            $table->unsignedSmallInteger('year');
            $table->unsignedTinyInteger('month');   // 1–12
            $table->string('reference')->unique()->comment('e.g. PAYROLL-2026-06');
 
            $table->enum('status', ['draft', 'processing', 'approved', 'paid', 'cancelled'])->default('draft');
 
            // Totals across all employees
            $table->decimal('total_gross', 15, 2)->default(0);
            $table->decimal('total_paye', 15, 2)->default(0);
            $table->decimal('total_nhif', 15, 2)->default(0);
            $table->decimal('total_nssf', 15, 2)->default(0);
            $table->decimal('total_housing_levy', 15, 2)->default(0);
            $table->decimal('total_net', 15, 2)->default(0);
            $table->decimal('total_employer_nssf', 15, 2)->default(0);
 
            $table->date('payment_date')->nullable();
            $table->text('notes')->nullable();
 
            $table->timestamps();
            $table->unique(['year', 'month']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payroll_runs');
    }
};

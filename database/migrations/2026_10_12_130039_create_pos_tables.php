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
        Schema::create('pos_sales', function (Blueprint $table) {
            $table->id();
            $table->string('receipt_number')->unique();

            $table->foreignId('cashier_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('client_id')->nullable()->constrained('users')->nullOnDelete()
                ->comment('Optional — walk-in sales have no client record');
            $table->string('walk_in_name')->nullable();
            $table->string('walk_in_phone')->nullable();

            $table->decimal('subtotal', 15, 2);
            $table->decimal('tax', 15, 2)->default(0);
            $table->decimal('discount', 15, 2)->default(0);
            $table->decimal('total', 15, 2);
            $table->string('currency', 3)->default('KES');

            // Payment
            $table->enum('payment_channel', [
                'cash', 'mpesa', 'airtel_money', 'mtn_momo', 'card', 'split',
            ])->default('cash');
            $table->string('mobile_money_code')->nullable();
            $table->decimal('amount_tendered', 15, 2)->nullable()
                ->comment('Cash given by customer (for change calculation)');
            $table->decimal('change_given', 15, 2)->nullable();

            $table->enum('status', ['completed', 'voided', 'refunded'])->default('completed');
            $table->text('void_reason')->nullable();

            // eTIMS (Kenya tax compliance)
            $table->string('etims_invoice_number')->nullable();
            $table->enum('etims_status', ['not_submitted', 'submitted', 'accepted', 'rejected'])
                ->default('not_submitted');

            $table->timestamps();

            $table->index(['cashier_id', 'created_at']);
            $table->index('status');
        });

        Schema::create('pos_sale_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pos_sale_id')->constrained('pos_sales')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->restrictOnDelete();

            $table->string('product_name')
                ->comment('Snapshot at time of sale, in case product is renamed later');
            $table->integer('quantity');
            $table->decimal('unit_price', 15, 2);
            $table->decimal('discount', 15, 2)->default(0);
            $table->decimal('line_total', 15, 2);

            $table->timestamps();
        });

        // Cashier shift / till session — opening/closing float reconciliation
        Schema::create('pos_shifts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cashier_id')->constrained('users')->cascadeOnDelete();
            $table->decimal('opening_float', 15, 2)->default(0);
            $table->decimal('closing_float', 15, 2)->nullable();
            $table->decimal('expected_cash', 15, 2)->nullable();
            $table->decimal('cash_variance', 15, 2)->nullable();
            $table->timestamp('opened_at');
            $table->timestamp('closed_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['cashier_id', 'opened_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pos_shifts');
        Schema::dropIfExists('pos_sale_items');
        Schema::dropIfExists('pos_sales');
    }
};

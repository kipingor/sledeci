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
        Schema::create('mobile_money_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained()->cascadeOnDelete();
            $table->string('channel', 20);                 // mpesa | airtel_money | mtn_momo
            $table->string('external_id');                 // CheckoutRequestID / our UUID reference
            $table->string('merchant_request_id')->nullable();
            $table->string('phone', 32)->nullable();
            $table->decimal('amount', 15, 2);
            $table->string('status', 16)->default('pending'); // pending | completed | failed
            $table->json('payload')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->unique(['channel', 'external_id']);
            $table->index(['invoice_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('mobile_money_requests');
    }
};

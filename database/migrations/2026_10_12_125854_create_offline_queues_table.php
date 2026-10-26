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
        Schema::create('offline_queues', function (Blueprint $table) {
            $table->id();
             $table->foreignId('user_id')->constrained()->cascadeOnDelete();

            // The action the client wants to perform
            $table->string('action')
                ->comment('e.g. create_invoice, record_payment, create_expense');
            $table->json('payload')
                ->comment('Full request payload serialised by the service worker');

            // Idempotency key set by the client to prevent double-processing
            $table->string('idempotency_key')->unique();

            $table->enum('status', ['pending', 'processing', 'applied', 'failed'])
                ->default('pending');
            $table->text('error')->nullable();
            $table->unsignedSmallInteger('attempts')->default(0);
            $table->timestamp('last_attempted_at')->nullable();

            // The server-created record that resulted from applying this action
            $table->nullableMorphs('result');
            $table->timestamps();

            $table->index(['user_id', 'status']);
            $table->index('idempotency_key');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('offline_queues');
    }
};

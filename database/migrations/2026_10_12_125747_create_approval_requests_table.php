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
        Schema::create('approval_requests', function (Blueprint $table) {
            $table->id();
            // Polymorphic subject (Tender, RFP, Invoice, PurchaseOrder, etc.)
            $table->morphs('approvable');

            // The user who initiated the request (the "Maker")
            $table->foreignId('requested_by')->constrained('users')->cascadeOnDelete();

            // Lifecycle
            $table->enum('status', ['pending', 'approved', 'rejected', 'cancelled'])
                ->default('pending')
                ->index();
            $table->string('action')->comment('The action being approved: submit, publish, send, etc.');
            $table->text('requester_notes')->nullable();
            $table->text('reviewer_notes')->nullable();

            // The "Checker" who acted on it
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();

            // Soft deadline for approval
            $table->timestamp('expires_at')->nullable();

            $table->json('metadata')->nullable()->comment('Snapshot of key data at time of request');

            $table->timestamps();
            $table->softDeletes();

            $table->index(['requested_by', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('approval_requests');
    }
};

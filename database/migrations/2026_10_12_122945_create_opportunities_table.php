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
        Schema::create('opportunities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_id')->nullable()->constrained('leads')->cascadeOnDelete();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->string('title')->nullable();
            $table->text('description')->nullable();
            $table->text('summary')->nullable(); // AI generated summary/proposal notes
            $table->decimal('estimated_value', 15, 2)->nullable();
            $table->unsignedTinyInteger('probability')->default(0); // 0-100 percentage
            $table->string('contact_name')->nullable();
            $table->string('contact_email')->nullable();
            $table->string('contact_phone')->nullable();
            $table->string('currency', 10)->default('USD');
            $table->enum('stage', ['qualification','proposal','negotiation','closed_won','closed_lost'])->default('qualification');
            $table->foreignId('owner_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('client_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('expected_close_date')->nullable();
            $table->json('ai_suggestions')->nullable(); // e.g., supplier suggestions
            $table->timestamps();
            $table->softDeletes();

            $table->index(['lead_id']);
            $table->index(['owner_id']);
            $table->index(['stage']);

            // Foreign key indexes
            $table->index('lead_id', 'idx_opportunities_lead_id');
            $table->index('assigned_to', 'idx_opportunities_assigned_to');
            
            // Status for filtering
            $table->index('stage', 'idx_opportunities_stage');
            
            // For revenue calculations
            $table->index(['stage', 'estimated_value'], 'idx_opportunities_stage_estimated_value');
            
            // For date-based queries
            $table->index('expected_close_date', 'idx_opportunities_expected_close_date');
            $table->index('created_at', 'idx_opportunities_created_at');
            
            // Soft deletes
            $table->index('deleted_at', 'idx_opportunities_deleted_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('opportunities');
    }
};

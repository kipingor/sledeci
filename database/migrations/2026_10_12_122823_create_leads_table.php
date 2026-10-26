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
        Schema::create('leads', function (Blueprint $table) {
            $table->id();
            $table->string('title')->nullable();
            $table->text('description')->nullable();
            $table->decimal('estimated_value', 10, 2)->nullable();
            $table->string('currency', 3)->default('KES');
            $table->json('ai_analysis')->nullable();
            $table->timestamp('ai_processed_at')->nullable();
            $table->enum('type', ['document', 'conversation'])->default('conversation');
            $table->string('status', 50)->default('new');
            $table->foreignId('created_by')->constrained('users');
            $table->foreignId('owner_id')->nullable()->constrained('users')->nullOnDelete(); // assigned owner
            $table->foreignId('client_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('pipeline_stage_id')->nullable()->constrained('pipeline_stages')->nullOnDelete();
            $table->unsignedInteger('order')->default(0);
            $table->json('metadata')->nullable(); // extracted requirements, short summary from AI
            $table->boolean('ai_reviewed')->default(false); // whether AI has extracted requirements
            $table->boolean('is_starred')->default(false);
            $table->timestamp('contacted_at')->nullable();
            $table->timestamp('qualified_at')->nullable();
            $table->timestamp('proposal_sent_at')->nullable();
            $table->timestamp('negotiation_started_at')->nullable();
            $table->timestamp('converted_to_opportunity_at')->nullable();
            $table->timestamp('won_at')->nullable();
            $table->timestamp('lost_at')->nullable();
            $table->timestamp('archived_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            // Single column indexes for frequent lookups
            $table->index('owner_id', 'idx_leads_owner_id');
            $table->index('pipeline_stage_id', 'idx_leads_pipeline_stage_id');
            $table->index('status', 'idx_leads_status');
            $table->index('type', 'idx_leads_type');
            $table->index('created_by', 'idx_leads_created_by');
            $table->index('is_starred', 'idx_leads_is_starred');

            // Composite indexes for common query patterns
            // For queries: WHERE owner_id = ? AND status = ?
            $table->index(['owner_id', 'status'], 'idx_leads_owner_status');

            // For queries: WHERE pipeline_stage_id = ? ORDER BY order
            $table->index(['pipeline_stage_id', 'order'], 'idx_leads_stage_order');

            // For queries: WHERE status = ? AND created_at >= ?
            $table->index(['status', 'created_at'], 'idx_leads_status_created');

            // For dashboard queries: WHERE created_at >= ? AND status IN (...)
            $table->index(['created_at', 'status'], 'idx_leads_created_status');

            // For soft delete queries
            $table->index('deleted_at', 'idx_leads_deleted_at');
        });

        Schema::create('lead_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_id')->constrained('leads')->cascadeOnDelete();
            $table->string('filename');
            $table->string('original_name');
            $table->string('mime_type')->nullable();
            $table->bigInteger('size')->nullable();
            $table->string('storage_path')->nullable(); // internal path or s3 path
            $table->string('status')->default('queued');
            $table->json('extracted_text')->nullable(); // optionally store extracted text
            $table->json('ai_summary')->nullable(); // AI extraction summary
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['lead_id']);
            $table->index(['status']);
            // Foreign key index
            $table->index('lead_id', 'idx_lead_documents_lead_id');

            // Status index for filtering processing documents
            $table->index('status', 'idx_lead_documents_status');

            // Composite index for queries: WHERE lead_id = ? AND status = ?
            $table->index(['lead_id', 'status'], 'idx_lead_documents_lead_status');

            // Created_at for recent documents queries
            $table->index('created_at', 'idx_lead_documents_created_at');

            // For finding documents by type
            $table->index('mime_type', 'idx_lead_documents_mime_type');

            // For soft delete queries
            $table->index('deleted_at', 'idx_lead_documents_deleted_at');
        });

        Schema::create('lead_questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_id')->constrained('leads')->cascadeOnDelete();
            $table->text('question');
            $table->text('context')->nullable(); // excerpt or reasoning
            $table->foreignId('asked_by')->nullable()->constrained('users')->nullOnDelete(); // AI or user id
            $table->boolean('answered')->default(false);
            $table->text('answer')->nullable();
            $table->integer('order')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['lead_id']);
            $table->index(['asked_by']);
            $table->index(['order']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lead_questions');
        Schema::dropIfExists('lead_documents');
        Schema::dropIfExists('leads');
    }
};

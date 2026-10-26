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
        Schema::create('tenders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('lead_id')->nullable()->constrained('leads')->nullOnDelete();
            $table->foreignId('opportunity_id')->nullable()->constrained('opportunities')->nullOnDelete();
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();

            $table->string('title');
            $table->string('reference_number')->nullable();
            $table->string('issuer')->nullable();
            $table->string('document_path')->nullable();
            $table->string('document_name')->nullable();

            // Lifecycle: reviewing → drafting → submitted → won | lost | withdrawn
            $table->enum('status', ['reviewing', 'drafting', 'submitted', 'won', 'lost', 'withdrawn'])->default('reviewing');
            $table->enum('approval_status', ['not_required', 'pending', 'approved', 'rejected'])->default('not_required');
            $table->foreignId('submitted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approval_requested_at')->nullable();
            $table->timestamp('approved_at')->nullable();

            $table->date('submission_deadline')->nullable();
            $table->date('submitted_at')->nullable();
            $table->decimal('estimated_value', 15, 2)->nullable();
            $table->string('currency', 3)->default('USD');

            // AI outputs
            $table->json('extracted_data')->nullable();     // requirements, criteria, budget, timeline
            $table->json('ai_analysis')->nullable();        // summary, strengths, risks, win themes
            $table->json('checklist')->nullable();          // [{id, category, label, done, notes}, ...]
            $table->json('information_gaps')->nullable();   // [{id, question, why_needed, answer, resolved}, ...]
            $table->json('generated_documents')->nullable(); // [{type, title, content, created_at}, ...]
            $table->json('agent_conversation')->nullable(); // [{role, content, created_at}, ...]

            $table->text('notes')->nullable();
            $table->json('metadata')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['owner_id', 'status']);
            $table->index('submission_deadline');
        });

        Schema::create('rfps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('lead_id')->nullable()->constrained('leads')->nullOnDelete();
            $table->foreignId('opportunity_id')->nullable()->constrained('opportunities')->nullOnDelete();
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();

            $table->enum('type', ['rfp', 'rfq'])->default('rfp')
                ->comment('Request for Proposal or Request for Quotation');
            $table->string('title');
            $table->string('reference_number')->nullable();
            $table->text('description')->nullable();
            $table->text('scope_of_work')->nullable();
            $table->json('requirements')->nullable()
                ->comment('[{id, category, description, mandatory}, ...]');
            $table->json('evaluation_criteria')->nullable()
                ->comment('[{id, criterion, weight_pct, description}, ...]');

            $table->date('issue_date')->nullable();
            $table->date('submission_deadline')->nullable();
            $table->date('award_date')->nullable();
            $table->decimal('budget', 15, 2)->nullable();
            $table->string('currency', 3)->default('KES');

            $table->enum('status', [
                'draft', 'review', 'published', 'closed', 'awarded', 'cancelled',
            ])->default('draft');

            // Maker-checker
            $table->enum('approval_status', ['not_required', 'pending', 'approved', 'rejected'])
                ->default('not_required');
            $table->foreignId('submitted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approval_requested_at')->nullable();
            $table->timestamp('approved_at')->nullable();

            $table->string('document_path')->nullable();
            $table->string('document_name')->nullable();
            $table->string('analysis_status')->nullable();
            $table->text('notes')->nullable();
            $table->json('metadata')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['owner_id', 'status']);
            $table->index('submission_deadline');
            $table->index('type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('rfps');
        Schema::dropIfExists('tenders');
    }
};

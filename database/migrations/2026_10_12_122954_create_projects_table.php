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
        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->foreignId('opportunity_id')->nullable()->constrained('opportunities')->cascadeOnDelete();
            $table->foreignId('lead_id')->nullable()->constrained('leads')->nullOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->text('objectives')->nullable();          // Measurable objectives
            $table->text('success_criteria')->nullable();     // How success is measured
            $table->text('scope_statement')->nullable();
            ;// Ch5 — formal scope statement
            $table->text('out_of_scope')->nullable();    // Explicit exclusions
            $table->text('assumptions')->nullable();       // Project assumptions log
            $table->text('constraints')->nullable();          // Known constraints
            $table->text('high_level_risks')->nullable(); // Initial high-level risks
            $table->json('deliverables')->nullable();         // High-level deliverables list
            
            $table->foreignId('client_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('owner_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('manager_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('sponsor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->enum('status', ['planning', 'active', 'on_hold', 'completed', 'cancelled'])->default('planning');
            $table->enum('phase', ['initiating', 'planning', 'executing', 'monitoring_controlling', 'closing'])->default('initiating');
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->decimal('budget', 15, 2)->nullable();
            $table->decimal('cost_baseline', 15, 2)->nullable(); // For EVM calculations
            $table->decimal('daily_rate', 10, 2)->nullable();     // Default daily rate for EVM AC calc
            $table->string('currency', 10)->default('USD');
            $table->json('metadata')->nullable(); // custom project metadata
            $table->timestamps();
            $table->softDeletes();

            $table->index(['opportunity_id']);
            $table->index(['client_id']);
            $table->index(['owner_id']);
            $table->index(['status']);

            // Foreign key indexes
            $table->index('opportunity_id', 'idx_projects_opportunity_id');
            $table->index('lead_id', 'idx_projects_lead_id');
            $table->index('manager_id', 'idx_projects_manager_id');
            
            // Status filtering
            $table->index('status', 'idx_projects_status');
            
            // Date-based queries
            $table->index('start_date', 'idx_projects_start_date');
            $table->index('end_date', 'idx_projects_end_date');
            
            // Active projects: WHERE status = 'active' AND start_date <= NOW()
            $table->index(['status', 'start_date'], 'idx_projects_status_start');
 
            $table->index('deleted_at', 'idx_projects_deleted_at');
            $table->index('phase', 'idx_projects_phase');
            $table->index('sponsor_id', 'idx_projects_sponsor_id');
        });

        // pivot table: project assignments (staff or contractors)
        Schema::create('project_users', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('role', 100)->nullable(); // e.g., PM, developer
            $table->decimal('allocation_percentage', 5, 2)->default(100);
            $table->decimal('hourly_rate', 8, 2)->nullable();
            $table->text('responsibilities')->nullable();    // RACI-level description
            $table->timestamp('joined_at')->nullable();
            $table->timestamps();
            $table->unique(['project_id', 'user_id'], 'project_user_unique');
        });

        Schema::create('project_templates', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->boolean('is_default')->default(false);
            $table->json('tasks')->nullable(); // Array of task templates
            $table->json('settings')->nullable(); // Additional settings
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->integer('estimated_duration_days')->nullable();
            $table->timestamps();

            $table->index('is_active');
            $table->index('is_default');
        });

        Schema::create('project_template_tasks', function (Blueprint $table) {
            // ── Primary key ───────────────────────────────────────────────────
            $table->id();
 
            // ── Parent template ───────────────────────────────────────────────
            $table->foreignId('template_id')
                  ->constrained('project_templates')
                  ->cascadeOnDelete();   // tasks are meaningless without their template
 
            // ── Task content ──────────────────────────────────────────────────
            $table->string('title');
            $table->text('description')->nullable();
 
            // ── Scheduling ────────────────────────────────────────────────────
            // `order`            — display / creation order within the template
            // `start_day_offset` — how many calendar days after project start_date
            //                      this task begins (0 = same day as project start)
            // `duration_days`    — planned duration in calendar days (minimum 1)
            $table->unsignedInteger('order')->default(0);
            $table->unsignedInteger('start_day_offset')->default(0);
            $table->unsignedInteger('duration_days')->default(1);
 
            // ── Classification ────────────────────────────────────────────────
            // 'critical' is present in ProjectTemplateSeeder (Deployment task)
            // and accepted by the controller's validation rule.
            $table->enum('priority', ['low', 'medium', 'high', 'critical'])
                  ->default('medium');
 
            // Status stored as a plain string (not enum) for flexibility — the
            // template task represents a *blueprint*, so the value is typically
            // 'todo'; the project task created from it can have any live status.
            $table->string('status', 50)->default('todo')->nullable();
 
            // ── Structured data ───────────────────────────────────────────────
            $table->json('checklist')->nullable();
 
            // metadata  — arbitrary key/value bag for future extensibility
            $table->json('metadata')->nullable();
 
            // ── Timestamps ────────────────────────────────────────────────────
            $table->timestamps();
 
            // ── Indexes ───────────────────────────────────────────────────────
            // Primary access pattern: fetch all tasks for a template ordered by `order`
            $table->index(['template_id', 'order'], 'idx_ptt_template_order');
        });

        Schema::create('project_risks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->foreignId('owner_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();

            // Identification
            $table->string('title');
            $table->text('description')->nullable();
            $table->enum('category', [
                'technical',
                'external',
                'organizational',
                'project_management',
                'schedule',
                'cost',
                'scope',
                'quality',
                'resource',
                'other',
            ])->default('other');

            // Qualitative Analysis (PMBOK §11.3) — scale 1-5
            $table->unsignedTinyInteger('probability')->default(1); // 1=Very Low … 5=Very High
            $table->unsignedTinyInteger('impact')->default(1);      // 1=Very Low … 5=Very High
            $table->decimal('risk_score', 4, 2)
                  ->storedAs('probability * impact')
                  ->comment('P×I score, auto-calculated'); // 1–25

            // Risk Response (PMBOK §11.5)
            $table->enum('response_type', [
                'avoid',
                'transfer',
                'mitigate',
                'accept',
                'escalate',
            ])->nullable();
            $table->text('response_plan')->nullable();
            $table->text('contingency_plan')->nullable();
            $table->text('trigger')->nullable(); // warning signs

            // Residual risk after response
            $table->unsignedTinyInteger('residual_probability')->nullable();
            $table->unsignedTinyInteger('residual_impact')->nullable();

            $table->enum('status', ['identified', 'active', 'realized', 'closed'])->default('identified');
            $table->date('identified_date')->nullable();
            $table->date('review_date')->nullable();
            $table->text('notes')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['project_id', 'status']);
            $table->index(['project_id', 'risk_score']);
        });

        Schema::create('project_issues', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->foreignId('owner_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('raised_by')->nullable()->constrained('users')->nullOnDelete();
            // Optional: link back to the risk that materialised
            $table->foreignId('risk_id')
                  ->nullable()
                  ->constrained('project_risks')
                  ->nullOnDelete();

            $table->string('title');
            $table->text('description')->nullable();

            $table->enum('category', [
                'technical', 'schedule', 'cost', 'scope',
                'resource', 'quality', 'stakeholder', 'external', 'other',
            ])->default('other');

            $table->enum('severity', ['low', 'medium', 'high', 'critical'])->default('medium');
            $table->enum('priority', ['low', 'medium', 'high', 'urgent'])->default('medium');

            $table->enum('status', [
                'open',
                'in_progress',
                'escalated',
                'resolved',
                'closed',
            ])->default('open');

            $table->text('resolution')->nullable();
            $table->date('raised_date')->nullable();
            $table->date('target_resolution_date')->nullable();
            $table->date('resolved_date')->nullable();

            $table->text('impact_description')->nullable();  // impact on scope/schedule/cost
            $table->text('notes')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['project_id', 'status']);
            $table->index(['project_id', 'severity']);
        });

        Schema::create('project_changes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->foreignId('requested_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();

            // Optionally link to a risk or issue that drove the change
            $table->foreignId('risk_id')->nullable()->constrained('project_risks')->nullOnDelete();
            $table->foreignId('issue_id')->nullable()->constrained('project_issues')->nullOnDelete();

            $table->string('title');
            $table->text('description');

            // Change Request type (PMBOK §4.3.3)
            $table->enum('change_type', [
                'corrective_action',   // realigning performance with plan
                'preventive_action',   // reducing probability of negative outcomes
                'defect_repair',       // fix a non-conforming component
                'scope_change',        // add/remove deliverables
                'schedule_change',     // adjust baseline dates
                'cost_change',         // adjust budget
                'other',
            ])->default('other');

            // Which baselines does this change affect?
            $table->boolean('impacts_scope')->default(false);
            $table->boolean('impacts_schedule')->default(false);
            $table->boolean('impacts_cost')->default(false);
            $table->boolean('impacts_quality')->default(false);

            // Quantified impact estimates
            $table->integer('schedule_impact_days')->nullable();   // + = delay, - = acceleration
            $table->decimal('cost_impact', 15, 2)->nullable();     // + = cost increase

            // Status workflow (PMBOK §4.6.3)
            $table->enum('status', [
                'submitted',
                'under_review',
                'approved',
                'rejected',
                'deferred',
                'implemented',
            ])->default('submitted');

            $table->text('justification')->nullable();
            $table->text('review_notes')->nullable();
            $table->date('requested_date')->nullable();
            $table->date('decision_date')->nullable();
            $table->date('implementation_date')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['project_id', 'status']);
        });

        // ─── Lessons Learned Register (PMBOK Ch4.4) ──────────────────────────
        // Updated throughout the project (not just at closing).
        // Becomes part of the organisational knowledge base for future projects.
        Schema::create('project_lessons', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
 
            $table->string('title');
            $table->text('situation');         // What happened?
            $table->text('impact');            // What was the effect?
            $table->text('recommendation');    // What should future projects do?
 
            $table->enum('category', [
                'technical',
                'schedule',
                'cost',
                'scope',
                'quality',
                'risk',
                'stakeholder',
                'team',
                'process',
                'tools',
                'other',
            ])->default('other');
 
            $table->enum('type', ['positive', 'negative', 'observation'])->default('negative');
 
            // Which phase the lesson was captured in
            $table->enum('phase_captured', [
                'initiating', 'planning', 'executing',
                'monitoring_controlling', 'closing',
            ])->nullable();
 
            $table->json('tags')->nullable();     // free-form searchable tags
 
            $table->timestamps();
 
            $table->index(['project_id', 'category']);
            $table->index(['project_id', 'type']);
        });

        // ─── Stakeholder Register (PMBOK Ch13.1) ─────────────────────────────
        // Documents identification information, assessment information,
        // and stakeholder classification for all stakeholders.
        Schema::create('project_stakeholders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            // Internal stakeholder (system user) — optional
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();

            // External stakeholder details (used when user_id is null)
            $table->string('name');
            $table->string('email')->nullable();
            $table->string('organization')->nullable();
            $table->string('role')->nullable();          // their role relative to the project

            // Power/Interest Grid (PMBOK §13.1.2 Tools)
            $table->enum('influence', ['low', 'medium', 'high'])->default('medium'); // power axis
            $table->enum('interest', ['low', 'medium', 'high'])->default('medium');  // interest axis

            // Engagement Level (PMBOK §13.2.2 — Stakeholder Engagement Assessment Matrix)
            $table->enum('current_engagement', [
                'unaware',     // Unaware of project and potential impacts
                'resistant',   // Aware but resistant to change
                'neutral',     // Aware but neither supportive nor resistant
                'supportive',  // Aware and supportive of change
                'leading',     // Aware and actively engaged in making the project succeed
            ])->default('unaware');

            $table->enum('desired_engagement', [
                'unaware',
                'resistant',
                'neutral',
                'supportive',
                'leading',
            ])->default('supportive');

            // Communication preferences
            $table->string('preferred_communication')->nullable(); // email/meetings/reports/etc
            $table->string('communication_frequency')->nullable(); // daily/weekly/monthly

            $table->text('expectations')->nullable();      // what they expect from the project
            $table->text('concerns')->nullable();          // their concerns/potential objections
            $table->text('engagement_strategy')->nullable(); // how to manage this stakeholder
            $table->text('notes')->nullable();

            $table->boolean('is_active')->default(true);

            $table->timestamps();
            $table->softDeletes();

            $table->index(['project_id', 'influence', 'interest']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('project_stakeholders');
        Schema::dropIfExists('project_lessons');
        Schema::dropIfExists('project_changes');
        Schema::dropIfExists('project_issues');
        Schema::dropIfExists('project_risks');
        Schema::dropIfExists('project_template_tasks');
        Schema::dropIfExists('project_templates');
        Schema::dropIfExists('project_users');
        Schema::dropIfExists('projects');
    }
};

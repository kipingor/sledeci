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
        Schema::create('tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('parent_id')->nullable()->constrained('tasks')->nullOnDelete();
            $table->string('wbs_code', 50)->nullable(); // e.g. "1.2.3"
            $table->integer('sort_order')->default(0);

            // Ch6 — Activity dependencies (predecessor)
            $table->unsignedBigInteger('predecessor_task_id')->nullable();
            $table->enum('dependency_type', ['FS', 'SS', 'FF', 'SF'])->default('FS');
            // FS = Finish-to-Start (most common), SS = Start-to-Start, FF = Finish-to-Finish, SF = Start-to-Finish
            $table->integer('duration_days')->nullable(); // Planned duration in working days

            // Foreign key (no constraint — self-referential with soft deletes gets complicated)
            $table->index('predecessor_task_id');
            $table->index('wbs_code');
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->foreignId('milestone_id')->nullable()->constrained('milestones')->nullOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->enum('priority', ['low', 'medium', 'high'])->default('medium');
            $table->enum('status', ['todo', 'in_progress', 'review', 'done'])->default('todo');
            $table->date('startAt')->nullable();
            $table->date('endAt')->nullable();
            $table->date('completed_at')->nullable();
            $table->date('due_date')->nullable();
            $table->integer('estimated_hours')->nullable();
            $table->integer('spent_hours')->default(0);
            $table->decimal('actual_cost', 10, 2)->nullable(); // AC for EVM
            $table->decimal('planned_cost', 10, 2)->nullable(); // PV component
            $table->string('group')->default('None');
            $table->json('metadata')->nullable();
            $table->text('delay_reason')->nullable();
            $table->text('mitigation')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['project_id']);
            $table->index(['milestone_id']);
            $table->index(['assigned_to']);
            $table->index(['status']);

            // Foreign key indexes
            $table->index('project_id', 'idx_tasks_project_id');
            $table->index('assigned_to', 'idx_tasks_assigned_to');
            $table->index('milestone_id', 'idx_tasks_milestone_id');

            // Status and priority filtering
            $table->index('status', 'idx_tasks_status');
            $table->index('priority', 'idx_tasks_priority');

            // Due date queries
            $table->index('endAt', 'idx_tasks_endAt');

            // Overdue tasks: WHERE status != 'completed' AND endAt < NOW()
            $table->index(['status', 'endAt'], 'idx_tasks_status_due');

            // User's tasks: WHERE assigned_to = ? AND status = ?
            $table->index(['assigned_to', 'status'], 'idx_tasks_assigned_status');

            // Soft deletes
            $table->index('deleted_at', 'idx_tasks_deleted_at');
            $table->index('parent_id', 'idx_tasks_parent_id');
            $table->index(['project_id', 'wbs_code'], 'idx_tasks_wbs');
        });

        Schema::create('task_dependencies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')
                ->constrained('tasks')
                ->cascadeOnDelete();
            $table->foreignId('depends_on_task_id')
                ->constrained('tasks')
                ->cascadeOnDelete();

            // Dependency type (Precedence Diagramming Method — PMBOK §6.3.2)
            // FS = Finish-to-Start (B can't start until A finishes — most common)
            // SS = Start-to-Start  (B can't start until A starts)
            // FF = Finish-to-Finish (B can't finish until A finishes)
            // SF = Start-to-Finish (rare — B can't finish until A starts)
            $table->enum('type', ['FS', 'SS', 'FF', 'SF'])->default('FS');

            // Lag (positive) or Lead (negative) in hours
            $table->integer('lag_hours')->default(0);

            $table->timestamps();

            $table->unique(['task_id', 'depends_on_task_id'], 'task_dependency_unique');
            $table->index('depends_on_task_id');
        });

        // time logs for tasks (for tracking cost)
        Schema::create('time_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')->constrained('tasks')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->dateTime('started_at')->default(DB::raw('CURRENT_TIMESTAMP'));
            $table->dateTime('ended_at')->nullable();
            // TIMESTAMPDIFF is MySQL/MariaDB-only; SQLite needs julianday() arithmetic.
            $table->integer('duration_minutes')->virtualAs(
                DB::getDriverName() === 'sqlite'
                    ? 'CAST(ROUND((julianday(ended_at) - julianday(started_at)) * 1440) AS INTEGER)'
                    : 'TIMESTAMPDIFF(MINUTE, started_at, ended_at)'
            );
            $table->decimal('hours', 8, 2)->virtualAs('duration_minutes / 60.0');
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('time_logs');
        Schema::dropIfExists('task_dependencies');
        Schema::dropIfExists('tasks');
    }
};

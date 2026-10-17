<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Pivot tables that reference both `projects` and `tasks` / `milestones`.
 * They must be created after all three parents exist (previously they lived in
 * the projects migration, which runs before tasks/milestones and breaks on
 * databases that enforce foreign keys at create time, e.g. MySQL).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('project_tasks')) {
            Schema::create('project_tasks', function (Blueprint $table) {
                $table->id();
                $table->foreignId('project_id')->constrained('projects')->onDelete('cascade');
                $table->foreignId('task_id')->constrained('tasks')->onDelete('cascade');
                $table->foreignId('assigned_by')->constrained('users')->onDelete('cascade');
                $table->date('assigned_at')->nullable();
                $table->enum('status', ['pending', 'in_progress', 'completed', 'delayed'])->default('pending');
                $table->json('metadata')->nullable();
                $table->timestamps();
                $table->softDeletes();

                $table->index(['project_id']);
                $table->index(['task_id']);
                $table->index(['assigned_by']);
                $table->index(['assigned_at']);
            });
        }

        if (! Schema::hasTable('project_milestones')) {
            Schema::create('project_milestones', function (Blueprint $table) {
                $table->id();
                $table->foreignId('project_id')->constrained('projects')->onDelete('cascade');
                $table->foreignId('milestone_id')->constrained('milestones')->onDelete('cascade');
                $table->date('assigned_at')->nullable();
                $table->timestamps();
                $table->softDeletes();

                $table->index(['project_id']);
                $table->index(['milestone_id']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('project_milestones');
        Schema::dropIfExists('project_tasks');
    }
};

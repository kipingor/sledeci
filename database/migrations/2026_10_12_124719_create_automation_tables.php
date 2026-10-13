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
        Schema::create('automation_rules', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('trigger_type'); // lead_status_changed, lead_created, etc.
            $table->json('trigger_conditions'); // Conditions to match
            $table->string('action_type'); // create_project, send_email, etc.
            $table->json('action_config'); // Action configuration
            $table->boolean('is_active')->default(true);
            $table->integer('execution_count')->default(0);
            $table->timestamp('last_executed_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('trigger_type');
            $table->index('is_active');
        });

        Schema::create('automation_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('automation_rule_id')->constrained()->cascadeOnDelete();
            $table->string('trigger_type');
            $table->json('trigger_data'); // Data that triggered the automation
            $table->string('status'); // success, failed, skipped
            $table->text('result_message')->nullable();
            $table->json('result_data')->nullable(); // Created resources (project_id, etc.)
            $table->text('error_message')->nullable();
            $table->timestamps();

            $table->index('automation_rule_id');
            $table->index('status');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('automation_logs');
        Schema::dropIfExists('automation_rules');
    }
};

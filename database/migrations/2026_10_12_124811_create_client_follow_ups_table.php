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
        // ── client follow-ups ──────────────────────────────────────────────
        // Linked to a client (user), optionally to a project or invoice.
        // Types: call, email, meeting, check_in, invoice_reminder, report
        Schema::create('client_follow_ups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->foreignId('invoice_id')->nullable()->constrained('invoices')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('type', 50)->default('call'); // call|email|meeting|check_in|invoice_reminder|report
            $table->string('subject');
            $table->text('notes')->nullable();
            $table->timestamp('scheduled_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->string('outcome')->nullable();    // interested|no_response|callback|resolved
            $table->string('priority')->default('normal'); // low|normal|high
            $table->timestamps();
            $table->softDeletes();

            $table->index(['client_id', 'scheduled_at']);
            $table->index(['completed_at']);
            $table->index(['type']);
        });

        // ── client reports ─────────────────────────────────────────────────
        // Periodic (weekly/monthly) reports sent/logged for a client.
        Schema::create('client_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('title');
            $table->string('period_type')->default('monthly'); // weekly|monthly|quarterly|custom
            $table->date('period_start');
            $table->date('period_end');
            $table->longText('content');   // HTML/Markdown report body
            $table->json('metrics')->nullable(); // snapshot of KPIs at send time
            $table->enum('status', ['draft', 'sent', 'viewed'])->default('draft');
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('viewed_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['client_id', 'period_start']);
            $table->index(['status']);
        });

        // ── fix Invoice: add sent_at column if missing ────────────────────
        if (! Schema::hasColumn('invoices', 'sent_at')) {
            Schema::table('invoices', function (Blueprint $table) {
                $table->timestamp('sent_at')->nullable()->after('status');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('client_follow_ups');
    }
};

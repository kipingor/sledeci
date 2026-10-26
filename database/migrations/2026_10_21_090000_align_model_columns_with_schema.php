<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Brings five tables in line with the Eloquent models, forms and services that
 * already read and write these columns. Before this migration:
 *
 *  - employees.helb_deduction     read by PayrollRunService, so HELB was silently never deducted
 *  - lead_questions.is_ai_generated  written by LeadQuestionController / AiController (SQL error)
 *  - expenses.category            validated and written by ExpenseController (SQL error)
 *  - tenders.analysis_status      declared on the rfps table by mistake; Tender, TenderController,
 *                                 TenderAgentService and AnalyzeTenderJob all write tenders.analysis_status
 *  - automation_logs              model, AutomationRule::execute() and the UI use
 *                                 triggerable_*, payload, result, executed_at, but the table
 *                                 had trigger_type / trigger_data (both NOT NULL) instead
 *
 * Every step is guarded, so the migration is safe on fresh installs and on
 * databases that were migrated before it existed.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('employees') && ! Schema::hasColumn('employees', 'helb_deduction')) {
            Schema::table('employees', function (Blueprint $table) {
                $table->decimal('helb_deduction', 12, 2)->default(0);
            });
        }

        if (Schema::hasTable('lead_questions') && ! Schema::hasColumn('lead_questions', 'is_ai_generated')) {
            Schema::table('lead_questions', function (Blueprint $table) {
                $table->boolean('is_ai_generated')->default(false);
            });
        }

        if (Schema::hasTable('expenses') && ! Schema::hasColumn('expenses', 'category')) {
            Schema::table('expenses', function (Blueprint $table) {
                $table->string('category', 50)->default('other')->index();
            });
        }

        if (Schema::hasTable('tenders') && ! Schema::hasColumn('tenders', 'analysis_status')) {
            Schema::table('tenders', function (Blueprint $table) {
                $table->string('analysis_status')->nullable();
            });
        }

        if (Schema::hasTable('automation_logs')) {
            Schema::table('automation_logs', function (Blueprint $table) {
                if (! Schema::hasColumn('automation_logs', 'triggerable_type')) {
                    $table->string('triggerable_type')->nullable();
                }
                if (! Schema::hasColumn('automation_logs', 'triggerable_id')) {
                    $table->unsignedBigInteger('triggerable_id')->nullable();
                }
                if (! Schema::hasColumn('automation_logs', 'payload')) {
                    $table->json('payload')->nullable();
                }
                if (! Schema::hasColumn('automation_logs', 'result')) {
                    $table->json('result')->nullable();
                }
                if (! Schema::hasColumn('automation_logs', 'executed_at')) {
                    $table->timestamp('executed_at')->nullable();
                }
            });

            // The legacy columns are no longer written; stop them rejecting inserts.
            Schema::table('automation_logs', function (Blueprint $table) {
                if (Schema::hasColumn('automation_logs', 'trigger_type')) {
                    $table->string('trigger_type')->nullable()->change();
                }
                if (Schema::hasColumn('automation_logs', 'trigger_data')) {
                    $table->json('trigger_data')->nullable()->change();
                }
            });

            Schema::table('automation_logs', function (Blueprint $table) {
                $table->index(['triggerable_type', 'triggerable_id'], 'automation_logs_triggerable_index');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('automation_logs')) {
            Schema::table('automation_logs', function (Blueprint $table) {
                $table->dropIndex('automation_logs_triggerable_index');
            });

            Schema::table('automation_logs', function (Blueprint $table) {
                $table->dropColumn(['triggerable_type', 'triggerable_id', 'payload', 'result', 'executed_at']);
            });
        }

        if (Schema::hasTable('tenders') && Schema::hasColumn('tenders', 'analysis_status')) {
            Schema::table('tenders', function (Blueprint $table) {
                $table->dropColumn('analysis_status');
            });
        }

        if (Schema::hasTable('expenses') && Schema::hasColumn('expenses', 'category')) {
            Schema::table('expenses', function (Blueprint $table) {
                $table->dropIndex(['category']);
                $table->dropColumn('category');
            });
        }

        if (Schema::hasTable('lead_questions') && Schema::hasColumn('lead_questions', 'is_ai_generated')) {
            Schema::table('lead_questions', function (Blueprint $table) {
                $table->dropColumn('is_ai_generated');
            });
        }

        if (Schema::hasTable('employees') && Schema::hasColumn('employees', 'helb_deduction')) {
            Schema::table('employees', function (Blueprint $table) {
                $table->dropColumn('helb_deduction');
            });
        }
    }
};

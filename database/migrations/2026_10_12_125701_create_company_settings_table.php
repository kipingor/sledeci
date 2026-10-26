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
        Schema::create('company_settings', function (Blueprint $table) {
            $table->id();
 
            // ── Company Identity ───────────────────────────────────────────────
            $table->string('company_name')->nullable();
            $table->string('company_email')->nullable();
            $table->string('company_phone')->nullable();
            $table->string('company_address')->nullable();
            $table->string('company_city')->nullable();
            $table->string('company_country')->default('KE');
            $table->string('company_logo_path')->nullable();
 
            // ── Tax / KRA Compliance ───────────────────────────────────────────
            $table->string('kra_pin')->nullable()->comment('KRA PIN (e.g. P051234567Q)');
            $table->string('kra_branch_name')->nullable();
            $table->string('kra_branch_id')->nullable()->comment('KRA branch/location code');
            $table->string('vat_number')->nullable();
            $table->decimal('default_vat_rate', 5, 2)->default(16.00)->comment('Standard VAT rate in %');
            $table->boolean('vat_registered')->default(false);
 
            // ── eTIMS Integration ──────────────────────────────────────────────
            $table->boolean('etims_enabled')->default(false);
            $table->enum('etims_environment', ['sandbox', 'production'])->default('sandbox');
            $table->string('etims_device_serial')->nullable()->comment('OSCU/VSCU device serial number');
            $table->string('etims_branch_id')->nullable()->comment('KRA-assigned branch identifier');
            $table->string('etims_taxpayer_pin')->nullable()->comment('Taxpayer PIN for eTIMS auth');
            $table->text('etims_device_cert')->nullable()->comment('OSCU device certificate (PEM)');
            $table->boolean('etims_auto_submit')->default(false)->comment('Auto-submit invoices on creation');
            $table->string('etims_invoice_prefix')->default('INV')->comment('Invoice series prefix');
            $table->unsignedInteger('etims_last_invoice_sequence')->default(0);
            $table->timestamp('etims_last_sync_at')->nullable();
            $table->json('etims_metadata')->nullable()->comment('Additional eTIMS configuration');
 
            // ── Financial Defaults ─────────────────────────────────────────────
            $table->string('default_currency', 3)->default('KES');
            $table->string('fiscal_year_start')->default('01-01')->comment('MM-DD format');
            $table->string('date_format')->default('d/m/Y');
 
            // ── Maker-Checker Workflow ─────────────────────────────────────────
            $table->boolean('maker_checker_enabled')->default(false)
                  ->comment('Master toggle for maker-checker across all modules');
            $table->boolean('maker_checker_tenders')->default(false)
                  ->comment('Require approval before Tender submission');
            $table->boolean('maker_checker_rfp')->default(false)
                  ->comment('Require approval before RFP/RFQ publishing');
            $table->boolean('maker_checker_invoices')->default(false)
                  ->comment('Require approval before Invoice is sent');
            $table->boolean('maker_checker_purchase_orders')->default(false)
                  ->comment('Require approval before PO is sent to supplier');
            $table->unsignedInteger('maker_checker_min_approvals')->default(1)
                  ->comment('Number of approvals required');
            $table->json('maker_checker_approver_roles')->nullable()
                  ->comment('Spatie role names allowed to approve');
 
            // ── Notifications ──────────────────────────────────────────────────
            $table->boolean('notify_on_approval_request')->default(true);
            $table->boolean('notify_on_approval_decision')->default(true);
            $table->boolean('notify_on_etims_failure')->default(true);
            $table->timestamps();
        });

        // Seed a single default row
        \DB::table('company_settings')->insert([
            'company_name'       => config('app.name', 'My Company'),
            'default_currency'   => 'KES',
            'default_vat_rate'   => 16.00,
            'maker_checker_enabled' => false,
            'etims_enabled'      => false,
            'etims_environment'  => 'sandbox',
            'created_at'         => now(),
            'updated_at'         => now(),
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('company_settings');
    }
};

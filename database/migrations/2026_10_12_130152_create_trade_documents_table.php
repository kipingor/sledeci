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
        Schema::create('trade_documents', function (Blueprint $table) {
            $table->id();
            $table->string('document_number')->unique();

            $table->foreignId('invoice_id')->nullable()->constrained('invoices')->nullOnDelete();
            $table->foreignId('purchase_order_id')->nullable()->constrained('purchase_orders')->nullOnDelete();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();

            $table->enum('type', [
                'certificate_of_origin',  // EAC / COMESA Certificate of Origin
                'customs_declaration',    // Export/import customs declaration
                'proforma_invoice',       // Pro-forma for customs valuation
                'packing_list',           // Itemised packing list
            ]);

            $table->enum('trade_direction', ['export', 'import'])->default('export');

            // Origin / destination
            $table->string('origin_country', 2)->comment('ISO 3166-1 alpha-2, e.g. KE');
            $table->string('destination_country', 2);
            $table->string('origin_region')->nullable()->comment('EAC | COMESA | SADC | Other');

            // Exporter / Importer details
            $table->string('exporter_name');
            $table->text('exporter_address');
            $table->string('exporter_kra_pin')->nullable();
            $table->string('importer_name');
            $table->text('importer_address');
            $table->string('importer_tax_id')->nullable();

            // Transport
            $table->string('transport_mode')->nullable()->comment('road | air | sea | rail');
            $table->string('vehicle_reg')->nullable();
            $table->string('border_post')->nullable()->comment('e.g. Malaba, Busia, Namanga');
            $table->date('departure_date')->nullable();

            // Goods declaration
            $table->json('items')
                ->comment('[{description, hs_code, quantity, unit, gross_weight, net_weight, value, currency}]');
            $table->decimal('total_value', 15, 2);
            $table->string('currency', 3)->default('USD');
            $table->decimal('total_gross_weight', 12, 3)->nullable()->comment('kg');
            $table->decimal('total_net_weight', 12, 3)->nullable()->comment('kg');

            // Certification
            $table->enum('status', ['draft', 'pending_certification', 'certified', 'rejected'])->default('draft');
            $table->string('certifying_authority')->nullable()->comment('e.g. Kenya Revenue Authority, KEBS');
            $table->string('certificate_reference')->nullable();
            $table->date('certified_date')->nullable();
            $table->date('valid_until')->nullable();

            $table->text('notes')->nullable();
            $table->string('document_path')->nullable()->comment('Generated PDF storage path');

            $table->timestamps();
            $table->softDeletes();

            $table->index(['type', 'status']);
            $table->index(['destination_country']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('trade_documents');
    }
};

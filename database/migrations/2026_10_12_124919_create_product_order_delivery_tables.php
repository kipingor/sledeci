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
        // ── 3. Products catalog ────────────────────────────────────────────
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('supplier_id')->nullable()->constrained('suppliers')->nullOnDelete();
            $table->string('name');
            $table->string('sku')->nullable()->unique();
            $table->string('barcode')->nullable()->unique()->comment('EAN-13, QR, or internal barcode for scanner lookup');
            $table->text('description')->nullable();
            $table->string('category')->nullable();
            $table->string('unit')->nullable();          // pcs, kg, box, licence…
            $table->decimal('unit_cost', 15, 2)->default(0);   // what we pay supplier
            $table->decimal('unit_price', 15, 2)->default(0);  // what we charge client
            $table->string('currency', 3)->default('KES');
            $table->integer('stock_qty')->default(0);
            $table->integer('reorder_point')->default(0)->comment('Alert when stock_qty falls to or below this level');
            $table->integer('reorder_qty')->default(0)->comment('Suggested order quantity when reorder point is hit');
            $table->string('location')->nullable()->comment('Warehouse / shelf location code, e.g. A3-B2');
            $table->boolean('active')->default(true);
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->index(['supplier_id']);
            $table->index(['category']);
            $table->index(['active']);
        });

        // ── 4. Purchase orders (us → supplier) ────────────────────────────
        Schema::create('purchase_orders', function (Blueprint $table) {
            $table->id();
            $table->string('number')->unique();
            $table->foreignId('supplier_id')->constrained('suppliers')->cascadeOnDelete();
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->foreignId('client_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->enum('status', ['draft', 'sent', 'confirmed', 'partially_delivered', 'delivered', 'cancelled'])->default('draft');
            $table->date('order_date')->nullable();
            $table->date('expected_delivery_date')->nullable();
            $table->string('currency', 10)->default('USD');
            $table->decimal('subtotal', 15, 2)->default(0);
            $table->decimal('tax', 15, 2)->default(0);
            $table->decimal('total', 15, 2)->default(0);
            $table->json('lines')->nullable();           // snapshot of line items
            $table->text('notes')->nullable();
            $table->string('shipping_address')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->index(['supplier_id']);
            $table->index(['status']);
            $table->index(['client_id']);
        });

        // ── 5. Deliveries (purchase order → delivery event) ───────────────
        Schema::create('deliveries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_order_id')->constrained('purchase_orders')->cascadeOnDelete();
            $table->foreignId('client_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('received_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('number')->nullable();
            $table->enum('status', ['pending', 'in_transit', 'delivered', 'partial', 'rejected'])->default('pending');
            $table->string('carrier')->nullable();        // delivery company name
            $table->string('tracking_number')->nullable();
            $table->string('tracking_url')->nullable();
            $table->date('expected_date')->nullable();
            $table->date('delivered_date')->nullable();
            $table->json('items')->nullable();           // which items + qty delivered
            $table->text('delivery_notes')->nullable();
            // Client sign-off
            $table->string('signed_by')->nullable();     // client name who signed
            $table->string('signature_path')->nullable(); // path to signature image
            $table->timestamp('signed_at')->nullable();
            $table->text('client_notes')->nullable();    // client notes on delivery
            $table->timestamps();
            $table->softDeletes();
            $table->index(['purchase_order_id']);
            $table->index(['status']);
        });

        // ── 6. Delivery documents (GRN, delivery notes, contracts) ─────────
        Schema::create('delivery_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('delivery_id')->nullable()->constrained('deliveries')->nullOnDelete();
            $table->foreignId('purchase_order_id')->nullable()->constrained('purchase_orders')->nullOnDelete();
            $table->foreignId('supplier_id')->nullable()->constrained('suppliers')->nullOnDelete();
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('type');        // grn|delivery_note|contract|invoice|other
            $table->string('title');
            $table->string('file_path')->nullable();
            $table->string('file_name')->nullable();
            $table->string('mime_type')->nullable();
            $table->bigInteger('file_size')->nullable();
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->text('notes')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->index(['delivery_id']);
            $table->index(['type']);
            $table->index(['status']);
        });

        Schema::create('stock_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();

            // Who / what triggered this movement
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->nullableMorphs('source');  // e.g. Delivery, Invoice, Adjustment

            $table->enum('type', [
                'receipt',       // goods received from supplier (PO delivery)
                'sale',          // stock sold to client (invoice line)
                'adjustment',    // manual correction (stocktake)
                'return_in',     // goods returned by client
                'return_out',    // goods returned to supplier
                'write_off',     // damaged / expired / lost
                'transfer_in',   // moved in from another location
                'transfer_out',  // moved out to another location
            ]);

            // Signed quantity: positive = in, negative = out
            $table->integer('quantity')
                ->comment('Signed delta: +receipt, -sale, ±adjustment');

            // Snapshot of stock level AFTER this movement
            $table->integer('quantity_after')
                ->comment('Running balance for audit trail');

            $table->string('reference')->nullable()
                ->comment('PO number, invoice number, adjustment ref, etc.');
            $table->decimal('unit_cost', 15, 4)->nullable()
                ->comment('Cost at time of movement (for FIFO/AVCO costing)');
            $table->text('notes')->nullable();

            $table->timestamps();

            $table->index(['product_id', 'created_at']);
            $table->index(['type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stock_movements');
        Schema::dropIfExists('delivery_documents');
        Schema::dropIfExists('deliveries');
        Schema::dropIfExists('purchase_orders');
        Schema::dropIfExists('products');
    }
};

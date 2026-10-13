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
        Schema::create('agent_visits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('field_agent_id')->constrained('field_agents')->cascadeOnDelete();
            $table->foreignId('client_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('lead_id')->nullable()->constrained('leads')->nullOnDelete();

            // GPS check-in
            $table->decimal('latitude',  10, 8)->nullable();
            $table->decimal('longitude', 11, 8)->nullable();
            $table->string('location_name')->nullable()
                ->comment('Reverse-geocoded address or landmark');

            $table->timestamp('checked_in_at')->nullable();
            $table->timestamp('checked_out_at')->nullable();

            $table->enum('purpose', ['sales_call', 'collection', 'delivery', 'survey', 'other'])
                ->default('sales_call');
            $table->enum('outcome', ['order_placed', 'payment_collected', 'no_decision', 'follow_up', 'rejected'])
                ->nullable();

            $table->decimal('amount_collected', 15, 2)->nullable()
                ->comment('Cash / mobile money collected during visit');
            $table->string('collection_reference')->nullable()
                ->comment('M-Pesa code or receipt number');

            $table->json('order_items')->nullable()
                ->comment('Products ordered during this visit [{product_id, qty, unit_price}]');
            $table->decimal('order_total', 15, 2)->nullable();
            $table->text('notes')->nullable();
            $table->string('signature_path')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['field_agent_id', 'checked_in_at']);
            $table->index(['client_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('agent_visits');
    }
};

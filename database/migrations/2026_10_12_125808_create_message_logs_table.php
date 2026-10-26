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
        Schema::create('message_logs', function (Blueprint $table) {
            $table->id();
            // Polymorphic subject (Invoice, Payment, PurchaseOrder, etc.)
            $table->nullableMorphs('messageable');

            $table->foreignId('sent_by')->nullable()->constrained('users')->nullOnDelete();

            $table->enum('channel', ['sms', 'whatsapp', 'email'])
                ->default('whatsapp');
            $table->string('to_phone')->nullable();
            $table->string('to_email')->nullable();
            $table->string('to_name')->nullable();

            $table->string('template')->nullable()
                ->comment('Template name: invoice_reminder, payment_receipt, etc.');
            $table->text('body');

            $table->enum('status', ['queued', 'sent', 'delivered', 'failed', 'read'])
                ->default('queued');
            $table->string('provider_message_id')->nullable()
                ->comment('Africa\'s Talking / WhatsApp Business API message ID');
            $table->text('provider_error')->nullable();
            $table->decimal('cost', 10, 6)->nullable()
                ->comment('Per-message cost in provider billing currency');

            $table->timestamp('sent_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('read_at')->nullable();

            $table->timestamps();

            $table->index(['to_phone', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('message_logs');
    }
};

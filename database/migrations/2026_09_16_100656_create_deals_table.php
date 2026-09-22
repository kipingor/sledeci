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
        Schema::create('deals', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id');
            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->string('title');
            $table->decimal('value', 15, 2)->default(0);
            $table->string('currency', 3)->default('KES');
            $table->enum('stage', [
                'new', 'qualified', 'proposal', 'negotiation', 'won', 'lost',
            ])->default('new');
            $table->date('expected_close_date')->nullable();
            $table->date('closed_at')->nullable();
            $table->text('notes')->nullable();
            $table->unsignedBigInteger('contact_id')->nullable();
            $table->foreign('contact_id')->references('id')->on('contacts')->nullOnDelete();
            $table->unsignedBigInteger('company_id')->nullable();
            $table->foreign('company_id')->references('id')->on('companies')->nullOnDelete();
            $table->unsignedBigInteger('owner_id')->nullable();
            $table->foreign('owner_id')->references('id')->on('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['tenant_id', 'stage']);
            $table->index(['tenant_id', 'owner_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('deals');
    }
};

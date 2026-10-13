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
        Schema::create('suppliers', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->nullable();
            $table->string('phone', 50)->nullable();
            $table->text('address')->nullable();
            $table->string('website')->nullable();
            $table->string('contact_person')->nullable();
            $table->string('payment_terms')->nullable();
            $table->string('category')->nullable();
            $table->text('notes')->nullable();
            $table->boolean('active')->default(true);

            $table->json('contact_info')->nullable(); // email, phone, address
            $table->json('products')->nullable(); // array of products/services
            $table->float('rating')->nullable()->default(0);
            $table->json('metadata')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['name']);
            $table->index(['rating']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('suppliers');
    }
};

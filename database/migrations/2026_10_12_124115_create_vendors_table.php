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
        Schema::create('vendors', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->enum('category', ['Construction','IT Services','Facility Management','Security','Transportation','Consulting','Equipment Supply','Electrical','General Contractor','Other'])->default('Other');
            $table->json('contact_info')->nullable(); // email, phone, address
            $table->json('metadata')->nullable(); // tax_pin, contact_referemce, notes
            $table->enum('status', ['active','inactive'])->default('active');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('vendors');
    }
};

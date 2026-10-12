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
        Schema::create('pipeline_stages', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique(); // machine key: new, contacted, qualified, opportunity, proposal_sent, closed_won, closed_lost
            $table->string('name'); // human name
            $table->string('color', 7)->nullable();
            $table->integer('order')->default(0); // ordering in kanban
            $table->timestamps();

            $table->index(['order']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pipeline_stages');
    }
};

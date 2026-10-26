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
        Schema::create('field_agents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('agent_code')->unique()->nullable()
                ->comment('Internal code, e.g. FA-001');
            $table->string('territory')->nullable()
                ->comment('Assigned geographic territory, e.g. Nairobi West');
            $table->string('phone')->nullable();
            $table->decimal('commission_rate', 5, 2)->default(0)
                ->comment('Commission % on sales');
            $table->boolean('active')->default(true);
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->index(['territory', 'active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('field_agents');
    }
};

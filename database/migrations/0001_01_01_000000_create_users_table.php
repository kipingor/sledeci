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
        Schema::create('staff_profiles', function (Blueprint $table) {
            $table->id();
            $table->string('employee_number')->nullable()->unique();
            $table->string('first_name');
            $table->string('last_name');
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->string('role')->nullable(); // job title
            $table->decimal('hourly_rate', 10, 2)->nullable();
            $table->decimal('monthly_salary', 12, 2)->nullable();
            $table->json('skills')->nullable();
            $table->string('avatar')->nullable();
            $table->boolean('is_client')->default(false);
            $table->boolean('is_contractor')->default(false);
            $table->boolean('is_available')->default(true);
            $table->string('company', 255)->nullable();
            $table->text('address')->nullable();
            $table->text('notes')->nullable();
            $table->date('client_since');
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');
            $table->foreignId('staff_profile_id')->nullable()->constrained('staff_profiles')->nullOnDelete();
            $table->string('locale', 10)->default('en');
            $table->string('timezone')->default('UTC');
            $table->rememberToken();
            $table->timestamps();
            $table->softDeletes();

            // For authentication queries
            $table->index('email_verified_at', 'idx_users_email_verified');

            // For active user queries
            $table->index('created_at', 'idx_users_created_at');
            $table->index('updated_at', 'idx_users_updated_at');
            $table->index('deleted_at', 'idx_users_deleted_at');
            $table->index('staff_profile_id', 'idx_users_staff_profile_id');
            $table->index('locale', 'idx_users_locale');
            $table->index('timezone', 'idx_users_timezone');
            $table->index('remember_token', 'idx_users_remember_token');
            $table->index('email', 'idx_users_email');
            $table->index('name', 'idx_users_name');
            $table->index('id', 'idx_users_id');
        });

        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('users');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('sessions');
        Schema::dropIfExists('staff_profiles');
    }
};

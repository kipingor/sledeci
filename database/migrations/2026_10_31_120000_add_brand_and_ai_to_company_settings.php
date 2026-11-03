<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('company_settings', function (Blueprint $table) {
            $table->string('brand_primary', 20)->nullable()->after('company_logo_path');
            $table->string('brand_secondary', 20)->nullable()->after('brand_primary');
            $table->string('brand_accent', 20)->nullable()->after('brand_secondary');
            $table->boolean('theme_from_logo')->default(true)->after('brand_accent');

            $table->string('ai_provider', 32)->nullable()->after('notify_on_etims_failure');
            $table->string('ai_plan', 32)->default('free')->after('ai_provider');
            $table->string('ai_subscription_status', 32)->nullable()->after('ai_plan');
            $table->string('ai_stripe_customer_id')->nullable()->after('ai_subscription_status');
            $table->string('ai_stripe_subscription_id')->nullable()->after('ai_stripe_customer_id');
            $table->timestamp('ai_subscription_ends_at')->nullable()->after('ai_stripe_subscription_id');
            // Encrypted BYOK keys (optional per company)
            $table->text('ai_gemini_key')->nullable()->after('ai_subscription_ends_at');
            $table->text('ai_openai_key')->nullable()->after('ai_gemini_key');
            $table->text('ai_anthropic_key')->nullable()->after('ai_openai_key');
        });
    }

    public function down(): void
    {
        Schema::table('company_settings', function (Blueprint $table) {
            $table->dropColumn([
                'brand_primary', 'brand_secondary', 'brand_accent', 'theme_from_logo',
                'ai_provider', 'ai_plan', 'ai_subscription_status',
                'ai_stripe_customer_id', 'ai_stripe_subscription_id', 'ai_subscription_ends_at',
                'ai_gemini_key', 'ai_openai_key', 'ai_anthropic_key',
            ]);
        });
    }
};

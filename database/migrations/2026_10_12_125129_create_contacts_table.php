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
        Schema::create('contacts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('lead_id')->nullable()->constrained('leads')->nullOnDelete();

            $table->string('name');
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->string('company')->nullable();
            $table->string('role')->nullable();

            // Where/how we met
            $table->string('event_name')->nullable();
            $table->string('event_location')->nullable();
            $table->date('met_at')->nullable();
            $table->enum('source', ['networking_event', 'conference', 'referral', 'cold_outreach', 'social_media', 'other'])
                ->default('networking_event');

            // What we discussed
            $table->text('talking_points')->nullable();  // raw user input
            $table->json('key_topics')->nullable();      // AI-extracted tags
            $table->text('notes')->nullable();           // private notes

            // Status tracking
            $table->enum('status', ['new', 'email_sent', 'following_up', 'responded', 'converted', 'dropped'])
                ->default('new');
            $table->integer('follow_up_count')->default(0);
            $table->timestamp('last_contact_at')->nullable();
            $table->timestamp('next_follow_up_at')->nullable();

            // AI-generated content
            $table->text('ai_email_draft')->nullable();
            $table->json('ai_follow_up_schedule')->nullable(); // [{day_offset, subject, body}, ...]
            $table->json('ai_context_summary')->nullable();    // {summary, pain_points, opportunities, ...}

            $table->timestamps();
            $table->softDeletes();

            $table->index(['owner_id', 'status']);
            $table->index('next_follow_up_at');
        });

        Schema::create('contact_follow_ups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('contact_id')->constrained()->cascadeOnDelete();
            $table->integer('sequence')->default(1);
            $table->string('subject');
            $table->text('body');
            $table->enum('status', ['scheduled', 'sent', 'replied', 'skipped'])->default('scheduled');
            $table->timestamp('scheduled_at');
            $table->timestamp('sent_at')->nullable();
            $table->text('reply_notes')->nullable();
            $table->timestamps();

            $table->index(['contact_id', 'status']);
            $table->index('scheduled_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('contact_follow_ups');
        Schema::dropIfExists('contacts');
    }
};

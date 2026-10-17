<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The User model doubles as the "client" record (User::clients() scope, ClientController,
 * invoices, projects ...) but the users table never received the columns for it.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'avatar')) {
                $table->string('avatar')->nullable();
            }
            if (! Schema::hasColumn('users', 'is_client')) {
                $table->boolean('is_client')->default(false)->index();
            }
            if (! Schema::hasColumn('users', 'client_since')) {
                $table->date('client_since')->nullable();
            }
            if (! Schema::hasColumn('users', 'company')) {
                $table->string('company')->nullable();
            }
            if (! Schema::hasColumn('users', 'phone')) {
                $table->string('phone', 50)->nullable();
            }
            if (! Schema::hasColumn('users', 'address')) {
                $table->text('address')->nullable();
            }
            if (! Schema::hasColumn('users', 'website')) {
                $table->string('website')->nullable();
            }
            if (! Schema::hasColumn('users', 'notes')) {
                $table->text('notes')->nullable();
            }
        });

        // staff_profiles.client_since was NOT NULL with no default, so no staff
        // member (who is not a client) could ever be inserted.
        if (Schema::hasTable('staff_profiles')) {
            Schema::table('staff_profiles', function (Blueprint $table) {
                $table->date('client_since')->nullable()->change();
            });
        }
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            foreach (['avatar', 'is_client', 'client_since', 'company', 'phone', 'address', 'website', 'notes'] as $col) {
                if (Schema::hasColumn('users', $col)) {
                    if ($col === 'is_client') {
                        $table->dropIndex(['is_client']);
                    }
                    $table->dropColumn($col);
                }
            }
        });
    }
};

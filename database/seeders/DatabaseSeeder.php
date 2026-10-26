<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // ── 1. initial administrator ─────────────────────────────────────
        // Configure ADMIN_USER_NAME / ADMIN_USER_EMAIL / ADMIN_USER_PASSWORD in .env.
        // (config('app.x', 'default') never applies its default when the key exists
        //  with a null value, so read the values explicitly.)
        $email = config('app.admin_user_email');
        $password = config('app.admin_user_password');

        if (empty($email) || empty($password)) {
            if (app()->isProduction()) {
                throw new \RuntimeException(
                    'Set ADMIN_USER_EMAIL and ADMIN_USER_PASSWORD in .env before seeding in production.'
                );
            }

            $email = $email ?: 'admin@example.com';
            $password = $password ?: Str::password(16);
            $this->command?->warn("Using development admin {$email} with password: {$password}");
        }

        User::firstOrCreate(
            ['email' => $email],
            [
                'name' => config('app.admin_user_name') ?: 'Administrator',
                'password' => Hash::make($password),
                'email_verified_at' => now(),
            ]
        );

        $this->call([
            RoleSeeder::class,
            ProjectTemplateSeeder::class,
            ChartOfAccountsSeeder::class,
            TaxCodeSeeder::class,
            PipelineStageSeeder::class,
        ]);
    }
}

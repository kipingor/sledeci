# Sledeci — Quick start

A modular Laravel 13.x application (Inertia + React frontend). This README covers the shortest path to get the app running locally and the recommended queue/session settings.

Requirements
- PHP >= 8.3
- Composer
- Node (npm or pnpm)
- Database (MySQL/Postgres/SQLite)
- Redis (recommended for queue)

Environment
- Copy .env.example to .env and set values accordingly. Required/important env vars:
  - APP_NAME, APP_ENV, APP_KEY, APP_URL
  - DB_CONNECTION, DB_HOST, DB_PORT, DB_DATABASE, DB_USERNAME, DB_PASSWORD
  - SESSION_DRIVER (recommended: database)
  - QUEUE_CONNECTION (recommended: redis)
  - REDIS_HOST, REDIS_PASSWORD, REDIS_PORT
  - MAIL_* (for notifications)
  - MPESA / MTN / AIRTEL webhook secrets (if using mobile money integrations)
  - MAILGUN / other API keys if using inbound email/webhooks

Quick setup (local)

```bash
# Install PHP dependencies
composer install

# Copy example env and generate app key
cp .env.example .env
php artisan key:generate

# If using sqlite for local work
# touch database/database.sqlite
# set DB_CONNECTION=sqlite in .env

# Create tables needed for sessions and queue if using database driver:
php artisan session:table
php artisan queue:table
php artisan queue:failed-table
php artisan migrate

# Node dependencies and dev server
npm install
npm run dev

# Optional: run queue worker for background jobs
php artisan queue:work --queue=default --sleep=3 --tries=3
```

Recommended production settings
- SESSION_DRIVER=database
- QUEUE_CONNECTION=redis
- Use Supervisor/systemd or Laravel Horizon to manage queue workers

Migration & worker notes
- To store sessions in the database: `php artisan session:table` then `php artisan migrate`.
- To use database-backed queues (fallback): `php artisan queue:table` and `php artisan queue:failed-table` then `php artisan migrate`.
- For Redis queues, ensure Redis is reachable (REDIS_HOST/REDIS_PORT) and run workers:
  - `php artisan queue:work redis --sleep=3 --tries=3 --timeout=120`

Example systemd service for queue worker

```ini
[Unit]
Description=Laravel Queue Worker

[Service]
User=www-data
Group=www-data
Restart=always
ExecStart=/usr/bin/php /path/to/artisan queue:work redis --sleep=3 --tries=3 --timeout=120

[Install]
WantedBy=multi-user.target
```


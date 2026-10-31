# Sledeci Core

Foundation for the Sledeci module suite: module registry, shared contracts, and role-based policy helpers.

## Installation

```bash
composer require sledeci/core
```

## Requirements

- PHP ^8.4
- Laravel 13+
- spatie/laravel-permission ^8.3

## Features

- Module registry for enabling/disabling feature modules
- Soft-dependency contracts (`ClientFinancialSummary`, `PendingFollowUps`) with null fallbacks
- Shared policy helpers for role-based access

## Configuration

Publish the config:

```bash
php artisan vendor:publish --tag=sledeci-config
```

## License

MIT

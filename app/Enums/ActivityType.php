<?php

namespace App\Enums;

enum ActivityType: string
{
    case CALL = 'call';
    case EMAIL = 'email';
    case MEETING = 'meeting';
    case NOTE = 'note';
    case TASK = 'task';

    /**
     * Get human-readable label for the activity type.
     */
    public function label(): string
    {
        return match ($this) {
            self::CALL => 'Phone Call',
            self::EMAIL => 'Email',
            self::MEETING => 'Meeting',
            self::NOTE => 'Note',
            self::TASK => 'Task',
        };
    }

    /**
     * Get icon name for the activity type.
     */
    public function icon(): string
    {
        return match ($this) {
            self::CALL => 'phone',
            self::EMAIL => 'mail',
            self::MEETING => 'calendar',
            self::NOTE => 'file-text',
            self::TASK => 'check-square',
        };
    }

    /**
     * Get color for the activity type.
     */
    public function color(): string
    {
        return match ($this) {
            self::CALL => 'blue',
            self::EMAIL => 'purple',
            self::MEETING => 'green',
            self::NOTE => 'gray',
            self::TASK => 'orange',
        };
    }

    /**
     * Check if this activity type requires scheduling.
     */
    public function requiresScheduling(): bool
    {
        return match ($this) {
            self::CALL, self::MEETING, self::TASK => true,
            self::EMAIL, self::NOTE => false,
        };
    }

    /**
     * Check if this activity type can be marked as completed.
     */
    public function canBeCompleted(): bool
    {
        return match ($this) {
            self::CALL, self::MEETING, self::TASK => true,
            self::EMAIL, self::NOTE => false,
        };
    }

    /**
     * Get all activity types.
     */
    public static function all(): array
    {
        return array_map(
            fn($case) => [
                'value' => $case->value,
                'label' => $case->label(),
                'icon' => $case->icon(),
                'color' => $case->color(),
            ],
            self::cases()
        );
    }
}
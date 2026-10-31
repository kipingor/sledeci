<?php

namespace App\Enums;

enum OpportunityStatus: string
{
    case OPEN = 'open';
    case WON = 'won';
    case LOST = 'lost';
    case ON_HOLD = 'on_hold';

    public function label(): string
    {
        return match ($this) {
            self::OPEN => 'Open',
            self::WON => 'Won',
            self::LOST => 'Lost',
            self::ON_HOLD => 'On Hold',
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::OPEN => 'blue',
            self::WON => 'green',
            self::LOST => 'red',
            self::ON_HOLD => 'yellow',
        };
    }

    public function isTerminal(): bool
    {
        return in_array($this, [self::WON, self::LOST], true);
    }

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    public static function toArray(): array
    {
        return array_map(
            fn ($case) => [
                'value' => $case->value,
                'label' => $case->label(),
                'color' => $case->color(),
            ],
            self::cases()
        );
    }
}

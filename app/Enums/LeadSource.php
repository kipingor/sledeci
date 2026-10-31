<?php

namespace App\Enums;

enum LeadSource: string
{
    case WEBSITE = 'website';
    case REFERRAL = 'referral';
    case COLD_CALL = 'cold_call';
    case EMAIL = 'email';
    case SOCIAL = 'social';
    case EVENT = 'event';
    case PARTNER = 'partner';
    case IMPORT = 'import';
    case OTHER = 'other';

    public function label(): string
    {
        return match ($this) {
            self::WEBSITE => 'Website',
            self::REFERRAL => 'Referral',
            self::COLD_CALL => 'Cold Call',
            self::EMAIL => 'Email Campaign',
            self::SOCIAL => 'Social Media',
            self::EVENT => 'Event / Conference',
            self::PARTNER => 'Partner',
            self::IMPORT => 'Import',
            self::OTHER => 'Other',
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::WEBSITE => 'blue',
            self::REFERRAL => 'green',
            self::COLD_CALL => 'orange',
            self::EMAIL => 'purple',
            self::SOCIAL => 'pink',
            self::EVENT => 'cyan',
            self::PARTNER => 'indigo',
            self::IMPORT => 'gray',
            self::OTHER => 'slate',
        };
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

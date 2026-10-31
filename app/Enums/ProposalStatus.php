<?php

namespace App\Enums;

enum ProposalStatus: string
{
    case DRAFT = 'draft';
    case SENT = 'sent';
    case VIEWED = 'viewed';
    case ACCEPTED = 'accepted';
    case REJECTED = 'rejected';
    case EXPIRED = 'expired';

    public function label(): string
    {
        return match ($this) {
            self::DRAFT => 'Draft',
            self::SENT => 'Sent',
            self::VIEWED => 'Viewed',
            self::ACCEPTED => 'Accepted',
            self::REJECTED => 'Rejected',
            self::EXPIRED => 'Expired',
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::DRAFT => 'gray',
            self::SENT => 'blue',
            self::VIEWED => 'cyan',
            self::ACCEPTED => 'green',
            self::REJECTED => 'red',
            self::EXPIRED => 'orange',
        };
    }

    public function isTerminal(): bool
    {
        return in_array($this, [self::ACCEPTED, self::REJECTED, self::EXPIRED], true);
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

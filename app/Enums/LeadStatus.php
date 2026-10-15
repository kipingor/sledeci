<?php

namespace App\Enums;

enum LeadStatus: string
{
    case NEW = 'new';
    case CONTACTED = 'contacted';
    case QUALIFIED = 'qualified';
    case PROPOSAL_SENT = 'proposal_sent';
    case NEGOTIATION = 'negotiation';
    case WON = 'won';
    case LOST = 'lost';
    case ARCHIVED = 'archived';

    public function label(): string
    {
        return match ($this) {
            self::NEW => 'New Lead',
            self::CONTACTED => 'Contacted',
            self::QUALIFIED => 'Qualified',
            self::PROPOSAL_SENT => 'Proposal Sent',
            self::NEGOTIATION => 'In Negotiation',
            self::WON => 'Won',
            self::LOST => 'Lost',
            self::ARCHIVED => 'Archived',
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::NEW => 'blue',
            self::CONTACTED => 'cyan',
            self::QUALIFIED => 'green',
            self::PROPOSAL_SENT => 'purple',
            self::NEGOTIATION => 'yellow',
            self::WON => 'emerald',
            self::LOST => 'red',
            self::ARCHIVED => 'gray',
        };
    }

    public function canTransitionTo(self $status): bool
    {
        $transitions = [
            self::NEW->value => [
                self::CONTACTED,
                self::LOST,
                self::ARCHIVED,
            ],
            self::CONTACTED->value => [
                self::QUALIFIED,
                self::LOST,
                self::ARCHIVED,
            ],
            self::QUALIFIED->value => [
                self::PROPOSAL_SENT,
                self::LOST,
                self::ARCHIVED,
            ],
            self::PROPOSAL_SENT->value => [
                self::NEGOTIATION,
                self::LOST,
                self::ARCHIVED,
            ],
            self::NEGOTIATION->value => [
                self::WON,
                self::LOST,
                self::ARCHIVED,
            ],
            self::WON->value => [
                self::ARCHIVED,
            ],
            self::LOST->value => [
                self::ARCHIVED,
            ],
            self::ARCHIVED->value => [],
        ];

        return in_array(
            $status,
            $transitions[$this->value] ?? [],
            true
        );
    }

    /**
     * Get the timestamp field associated with the status, if any.
     */
    public function timestampField(): ?string
    {
        return match ($this) {
            self::CONTACTED => 'contacted_at',
            self::QUALIFIED => 'qualified_at',
            self::PROPOSAL_SENT => 'proposal_sent_at',
            self::NEGOTIATION => 'negotiation_started_at',
            self::WON => 'won_at',
            self::LOST => 'lost_at',
            self::ARCHIVED => 'archived_at',
            default => null,
        };
    }

    /**
     * Determine if the status is a terminal status.
     */
    public function isTerminal(): bool
    {
        return in_array($this, [self::WON, self::LOST, self::ARCHIVED], true);
    }

    /**
     * Get all active statuses.
     */
    public static function active(): array
    {
        return [
            self::NEW,
            self::CONTACTED,
            self::QUALIFIED,
            self::PROPOSAL_SENT,
            self::NEGOTIATION,
        ];
    }

    /**
     * Get all valid transitions from current status.
     */
    public function getAllowedTransitions(): array
    {
        $transitions = [
            self::NEW->value => [self::CONTACTED, self::LOST, self::ARCHIVED],
            self::CONTACTED->value => [self::QUALIFIED, self::LOST, self::ARCHIVED],
            self::QUALIFIED->value => [self::PROPOSAL_SENT, self::LOST, self::ARCHIVED],
            self::PROPOSAL_SENT->value => [self::NEGOTIATION, self::LOST, self::ARCHIVED],
            self::NEGOTIATION->value => [self::WON, self::LOST, self::ARCHIVED],
            self::WON->value => [self::ARCHIVED],
            self::LOST->value => [self::ARCHIVED],
            self::ARCHIVED->value => [],
        ];

        return $transitions[$this->value] ?? [];
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

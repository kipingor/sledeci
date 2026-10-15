<?php

namespace App\Enums;

enum PipelineStage: string
{
    case INTAKE = 'intake';
    case DISCOVERY = 'discovery';
    case PROPOSAL = 'proposal';
    case NEGOTIATION = 'negotiation';
    case CLOSED_WON = 'closed_won';
    case CLOSED_LOST = 'closed_lost';

    /**
     * Get the human-readable label for the pipeline stage.
     */
    public function label(): string
    {
        return match ($this) {
            self::INTAKE => 'Intake',
            self::DISCOVERY => 'Discovery',
            self::PROPOSAL => 'Proposal',
            self::NEGOTIATION => 'Negotiation',
            self::CLOSED_WON => 'Closed Won',
            self::CLOSED_LOST => 'Closed Lost',
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::INTAKE => 'blue',
            self::DISCOVERY => 'purple',
            self::PROPOSAL => 'orange',
            self::NEGOTIATION => 'yellow',
            self::CLOSED_WON => 'green',
            self::CLOSED_LOST => 'red',
        };
    }

    /**
     * Determine if the stage requires a proposal to be sent.
     */
    public function requiresProposal(): bool
    {
        return $this === self::PROPOSAL;
    }

    public function isTerminal(): bool
    {
        return in_array($this, [self::CLOSED_WON, self::CLOSED_LOST], true);
    }

    public function order(): int
    {
        return match ($this) {
            self::INTAKE => 1,
            self::DISCOVERY => 2,
            self::PROPOSAL => 3,
            self::NEGOTIATION => 4,
            self::CLOSED_WON => 5,
            self::CLOSED_LOST => 6,
        };
    }

    public function nextStage(): ?self
    {
        return match ($this) {
            self::INTAKE => [self::DISCOVERY, self::CLOSED_LOST],
            self::DISCOVERY => [self::PROPOSAL, self::CLOSED_LOST],
            self::PROPOSAL => [self::NEGOTIATION, self::CLOSED_LOST],
            self::NEGOTIATION => [self::CLOSED_WON, self::CLOSED_LOST],
            self::CLOSED_WON, self::CLOSED_LOST => null,
        };
    }

    public function canMoveTo(self $stage): bool
    {
        return in_array($stage, $this->nextStage() ?? [], true);
    }

    public static function active(): array
    {
        return [
            self::INTAKE,
            self::DISCOVERY,
            self::PROPOSAL,
            self::NEGOTIATION,
        ];
    }

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    public static function toArray(): array
    {
        return array_map(
            fn($case) => [
                'value' => $case->value,
                'label' => $case->label(),
                'color' => $case->color(),
            ],
            self::cases()
        );
    }
}

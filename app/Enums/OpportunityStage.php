<?php

namespace App\Enums;

enum OpportunityStage: string
{
    case QUALIFICATION = 'qualification';
    case PROPOSAL = 'proposal';
    case NEGOTIATION = 'negotiation';
    case CLOSED_WON = 'closed_won';
    case CLOSED_LOST = 'closed_lost';

    /**
     * Get human-readable label.
     */
    public function label(): string
    {
        return match ($this) {
            self::QUALIFICATION => 'Qualification',
            self::PROPOSAL => 'Proposal',
            self::NEGOTIATION => 'Negotiation',
            self::CLOSED_WON => 'Closed Won',
            self::CLOSED_LOST => 'Closed Lost',
        };
    }

    /**
     * Get color for UI.
     */
    public function color(): string
    {
        return match ($this) {
            self::QUALIFICATION => 'gray',
            self::PROPOSAL => 'blue',
            self::NEGOTIATION => 'orange',
            self::CLOSED_WON => 'green',
            self::CLOSED_LOST => 'red',
        };
    }

    /**
     * Get icon for UI.
     */
    public function icon(): string
    {
        return match ($this) {
            self::QUALIFICATION => 'search',
            self::PROPOSAL => 'file-text',
            self::NEGOTIATION => 'message-circle',
            self::CLOSED_WON => 'check-circle',
            self::CLOSED_LOST => 'x-circle',
        };
    }

    /**
     * Get default probability for this stage.
     */
    public function defaultProbability(): int
    {
        return match ($this) {
            self::QUALIFICATION => 10,
            self::PROPOSAL => 30,
            self::NEGOTIATION => 60,
            self::CLOSED_WON => 100,
            self::CLOSED_LOST => 0,
        };
    }

    /**
     * Check if this is a closed stage.
     */
    public function isClosed(): bool
    {
        return in_array($this, [self::CLOSED_WON, self::CLOSED_LOST]);
    }

    /**
     * Check if this is a won stage.
     */
    public function isWon(): bool
    {
        return $this === self::CLOSED_WON;
    }

    /**
     * Check if this is a lost stage.
     */
    public function isLost(): bool
    {
        return $this === self::CLOSED_LOST;
    }

    /**
     * Get all active (non-closed) stages.
     */
    public static function activeStages(): array
    {
        return [
            self::QUALIFICATION,
            self::PROPOSAL,
            self::NEGOTIATION,
        ];
    }

    /**
     * Get next stage in pipeline.
     */
    public function nextStage(): ?self
    {
        return match ($this) {
            self::QUALIFICATION => self::PROPOSAL,
            self::PROPOSAL => self::NEGOTIATION,
            self::NEGOTIATION => self::CLOSED_WON,
            default => null,
        };
    }

    /**
     * Get previous stage in pipeline.
     */
    public function previousStage(): ?self
    {
        return match ($this) {
            self::PROPOSAL => self::QUALIFICATION,
            self::NEGOTIATION => self::PROPOSAL,
            self::CLOSED_WON => self::NEGOTIATION,
            default => null,
        };
    }
}
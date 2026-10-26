<?php

namespace App\Enums;

enum LeadDocumentStatus: string
{
    case QUEUED = 'queued';
    case PENDING = 'pending';
    case PROCESSING = 'processing';
    case SUCCEEDED = 'succeeded';
    case FAILED = 'failed';

    public function label(): string
    {
        return match ($this) {
            self::QUEUED => 'Queued',
            self::PENDING => 'Pending',
            self::PROCESSING => 'Processing',
            self::SUCCEEDED => 'Completed',
            self::FAILED => 'Failed',
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::QUEUED => 'orange',
            self::PENDING => 'gray',
            self::PROCESSING => 'blue',
            self::SUCCEEDED => 'green',
            self::FAILED => 'red',
        };
    }

    public function isTerminal(): bool
    {
        return in_array($this, [self::SUCCEEDED, self::FAILED], true);
    }
}
<?php

namespace App\DataTransferObjects\Pipeline;

use Spatie\LaravelData\Data;

class MoveLeadData extends Data
{
    public function __construct(
        public int $leadId,
        public int $stageId,
        public ?string $reason = null,
    ) {}
}

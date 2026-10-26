<?php

namespace App\Actions\Lead;

use App\Models\Lead;
use App\Services\Lead\LeadService;

class CreateLeadAction
{
    
    public function __construct(
        protected LeadService $leadService
    ) {}

    public function execute(array $data): Lead
    {
        return $this->leadService->create($data);
    }
}
<?php

namespace App\Exceptions\Lead;

use RuntimeException;

class LeadNotFoundException extends RuntimeException
{
    public function __construct(string $message = 'Lead not found.', int $code = 0, ?\Throwable $previous = null)
    {
        parent::__construct($message, $code, $previous);
    }
}

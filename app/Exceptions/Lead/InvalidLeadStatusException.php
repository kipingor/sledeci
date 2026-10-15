<?php

namespace App\Exceptions\Lead;

use RuntimeException;

class InvalidLeadStatusException extends RuntimeException
{
    public function __construct(string $message = 'Invalid lead status.', int $code = 0, ?\Throwable $previous = null)
    {
        parent::__construct($message, $code, $previous);
    }
}

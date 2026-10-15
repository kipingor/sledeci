<?php

namespace App\Exceptions\Document;

use RuntimeException;

class InvalidDocumentTypeException extends RuntimeException
{
    public function __construct(string $message = 'Unsupported document type.', int $code = 0, ?\Throwable $previous = null)
    {
        parent::__construct($message, $code, $previous);
    }
}

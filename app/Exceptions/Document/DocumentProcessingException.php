<?php

namespace App\Exceptions\Document;

use RuntimeException;

class DocumentProcessingException extends RuntimeException
{
    public function __construct(string $message = 'The document could not be processed.', int $code = 0, ?\Throwable $previous = null)
    {
        parent::__construct($message, $code, $previous);
    }
}

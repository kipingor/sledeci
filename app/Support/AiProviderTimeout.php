<?php

namespace App\Support;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class AiProviderTimeout
{
    public const CODE = 'ai_provider_timeout';

    public const MESSAGE = 'The AI service did not respond in time. The application is still working; please try again shortly.';

    public static function response(ConnectionException $exception, string $operation): JsonResponse
    {
        Log::warning('AI provider request timed out', [
            'operation' => $operation,
            'exception' => $exception::class,
        ]);

        return response()->json([
            'ok' => false,
            'code' => self::CODE,
            'message' => self::MESSAGE,
        ], 504);
    }
}

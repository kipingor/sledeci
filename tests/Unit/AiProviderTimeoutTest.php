<?php

namespace Tests\Unit;

use App\Support\AiProviderTimeout;
use Illuminate\Http\Client\ConnectionException;
use Tests\TestCase;

class AiProviderTimeoutTest extends TestCase
{
    public function test_it_returns_a_safe_gateway_timeout_response(): void
    {
        $response = AiProviderTimeout::response(
            new ConnectionException('Connection timed out'),
            'test generation'
        );

        $this->assertSame(504, $response->getStatusCode());
        $this->assertSame([
            'ok' => false,
            'code' => AiProviderTimeout::CODE,
            'message' => AiProviderTimeout::MESSAGE,
        ], $response->getData(true));
    }
}

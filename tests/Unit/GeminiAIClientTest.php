<?php

namespace Tests\Unit;

use App\Services\AI\GeminiAIClient;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class GeminiAIClientTest extends TestCase
{
    public function test_chat_sends_api_key_in_header_not_url(): void
    {
        config([
            'services.gemini.api_key' => 'test-gemini-key',
            'services.gemini.model' => 'gemini-3.8-flash',
        ]);
        Http::fake([
            '*' => Http::response([
                'candidates' => [
                    ['content' => ['parts' => [['text' => 'Hello']]]],
                ],
            ]),
        ]);

        $result = (new GeminiAIClient)->chat('Say hello in one word');

        $this->assertSame('Hello', $result);
        Http::assertSent(fn ($request) => $request->hasHeader('x-goog-api-key', 'test-gemini-key')
            && ! str_contains($request->url(), 'test-gemini-key')
            && ! str_contains($request->url(), '?key='));
    }

    public function test_chat_stream_sends_api_key_in_header_not_url(): void
    {
        config([
            'services.gemini.api_key' => 'test-gemini-key',
            'services.gemini.model' => 'gemini-3.8-flash',
        ]);
        Http::fake([
            '*' => Http::response([
                'candidates' => [
                    ['content' => ['parts' => [['text' => 'Hello']]]],
                ],
            ]),
        ]);
        $chunks = [];

        (new GeminiAIClient)->chatStream('Say hello in one word', function (string $chunk) use (&$chunks): void {
            $chunks[] = $chunk;
        });

        $this->assertSame(['Hello'], $chunks);
        Http::assertSent(fn ($request) => $request->hasHeader('x-goog-api-key', 'test-gemini-key')
            && ! str_contains($request->url(), 'test-gemini-key')
            && ! str_contains($request->url(), '?key='));
    }
}

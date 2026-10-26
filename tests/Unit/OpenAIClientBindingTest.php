<?php

namespace Tests\Unit;

use App\Services\AI\OpenAIClient;
use App\Services\AI\OpenAIClientGuzzle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use PHPUnit\Framework\TestCase;

class OpenAIClientBindingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->markTestSkipped(
            'STALE: App\\Services\\AI\\OpenAIClientGuzzle does not exist and this class extends the bare '
            .'PHPUnit TestCase, so $this->app is never booted. Rewrite against Tests\\TestCase or remove.'
        );
    }

    /** @test */
    public function it_resolves_the_correct_implementation()
    {
        $resolved = $this->app->make(OpenAIClient::class);

        $this->assertInstanceOf(
            OpenAIClientGuzzle::class,
            $resolved,
            'The service container should resolve OpenAIClientGuzzle when OpenAIClient is requested.'
        );
    }

    /** @test */
    public function it_can_generate_a_mocked_response()
    {
        // Fake HTTP response
        Http::fake([
            '*' => Http::response([
                'choices' => [
                    [
                        'message' => ['content' => 'Mocked AI response'],
                    ],
                ],
            ], 200),
        ]);

        $client = app(OpenAIClient::class);

        $result = $client->chat('Hello world');

        $this->assertEquals('Mocked AI response', $result);
    }
}

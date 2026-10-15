<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;
use App\Services\AI\OpenAIClient;
use App\Services\AI\OpenAIClientGuzzle;
use Illuminate\Foundation\Testing\RefreshDatabase;

class OpenAIClientBindingTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function it_resolves_the_correct_implementation()
    {
        $resolved = $this->app->make(OpenAIClient::class);

        $this->assertInstanceOf(
            OpenAIClientGuzzle::class,
            $resolved,
            "The service container should resolve OpenAIClientGuzzle when OpenAIClient is requested."
        );
    }

    /** @test */
    public function it_can_generate_a_mocked_response()
    {
        // Fake HTTP response
        \Illuminate\Support\Facades\Http::fake([
            '*' => \Illuminate\Support\Facades\Http::response([
                'choices' => [
                    [
                        'message' => ['content' => 'Mocked AI response']
                    ]
                ]
            ], 200),
        ]);

        $client = app(OpenAIClient::class);

        $result = $client->chat('Hello world');

        $this->assertEquals('Mocked AI response', $result);
    }
}

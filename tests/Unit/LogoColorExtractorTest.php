<?php

namespace Tests\Unit;

use App\Services\Branding\LogoColorExtractor;
use Tests\TestCase;

class LogoColorExtractorTest extends TestCase
{
    public function test_extract_returns_palette_from_png(): void
    {
        if (! extension_loaded('gd')) {
            $this->markTestSkipped('GD required');
        }

        $path = sys_get_temp_dir().'/sledeci-logo-test.png';
        $img = imagecreatetruecolor(40, 40);
        $orange = imagecolorallocate($img, 245, 158, 11); // #F59E0B
        imagefilledrectangle($img, 0, 0, 40, 40, $orange);
        imagepng($img, $path);
        imagedestroy($img);

        $palette = (new LogoColorExtractor)->extract($path);
        @unlink($path);

        $this->assertIsArray($palette);
        $this->assertArrayHasKey('primary', $palette);
        $this->assertMatchesRegularExpression('/^#[0-9A-F]{6}$/i', $palette['primary']);
    }

    public function test_extract_returns_null_for_missing_file(): void
    {
        $this->assertNull((new LogoColorExtractor)->extract('/tmp/does-not-exist-logo.png'));
    }
}

<?php

namespace App\Services\Branding;

/**
 * Extract dominant brand colours from an uploaded logo (GD).
 */
class LogoColorExtractor
{
    /**
     * @return array{primary: string, secondary: string, accent: string}|null
     */
    public function extract(string $absolutePath): ?array
    {
        if (! is_file($absolutePath) || ! extension_loaded('gd')) {
            return null;
        }

        $image = $this->load($absolutePath);
        if ($image === false) {
            return null;
        }

        $w = imagesx($image);
        $h = imagesy($image);
        if ($w < 1 || $h < 1) {
            imagedestroy($image);

            return null;
        }

        // Sample a grid; skip near-white / near-black / near-transparent
        $buckets = [];
        $stepX = max(1, (int) floor($w / 40));
        $stepY = max(1, (int) floor($h / 40));

        for ($y = 0; $y < $h; $y += $stepY) {
            for ($x = 0; $x < $w; $x += $stepX) {
                $rgba = imagecolorat($image, $x, $y);
                $a = ($rgba & 0x7F000000) >> 24;
                // GD alpha 0 = opaque for truecolor... varies; also check palette
                $r = ($rgba >> 16) & 0xFF;
                $g = ($rgba >> 8) & 0xFF;
                $b = $rgba & 0xFF;

                // Skip very light / very dark
                $luma = (0.2126 * $r + 0.7152 * $g + 0.0722 * $b) / 255;
                if ($luma > 0.92 || $luma < 0.08) {
                    continue;
                }
                // Low saturation greys
                $max = max($r, $g, $b);
                $min = min($r, $g, $b);
                if ($max - $min < 18) {
                    continue;
                }

                // Quantize
                $rq = (int) (round($r / 24) * 24);
                $gq = (int) (round($g / 24) * 24);
                $bq = (int) (round($b / 24) * 24);
                $key = sprintf('%03d-%03d-%03d', $rq, $gq, $bq);
                $buckets[$key] = ($buckets[$key] ?? 0) + 1;
            }
        }

        imagedestroy($image);

        if ($buckets === []) {
            return null;
        }

        arsort($buckets);
        $keys = array_keys($buckets);
        $colors = array_map(fn ($k) => $this->keyToHex($k), array_slice($keys, 0, 3));

        return [
            'primary' => $colors[0],
            'secondary' => $colors[1] ?? $this->darken($colors[0], 0.35),
            'accent' => $colors[2] ?? $this->lighten($colors[0], 0.2),
        ];
    }

    /** @return \GdImage|false */
    protected function load(string $path)
    {
        $info = @getimagesize($path);
        if ($info === false) {
            return false;
        }

        return match ($info[2] ?? null) {
            IMAGETYPE_JPEG => @imagecreatefromjpeg($path),
            IMAGETYPE_PNG => @imagecreatefrompng($path),
            IMAGETYPE_GIF => @imagecreatefromgif($path),
            IMAGETYPE_WEBP => function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($path) : false,
            default => false,
        };
    }

    protected function keyToHex(string $key): string
    {
        [$r, $g, $b] = array_map('intval', explode('-', $key));

        return sprintf('#%02X%02X%02X', min(255, $r), min(255, $g), min(255, $b));
    }

    protected function darken(string $hex, float $amount): string
    {
        [$r, $g, $b] = $this->hexToRgb($hex);

        return sprintf(
            '#%02X%02X%02X',
            max(0, (int) ($r * (1 - $amount))),
            max(0, (int) ($g * (1 - $amount))),
            max(0, (int) ($b * (1 - $amount))),
        );
    }

    protected function lighten(string $hex, float $amount): string
    {
        [$r, $g, $b] = $this->hexToRgb($hex);

        return sprintf(
            '#%02X%02X%02X',
            min(255, (int) ($r + (255 - $r) * $amount)),
            min(255, (int) ($g + (255 - $g) * $amount)),
            min(255, (int) ($b + (255 - $b) * $amount)),
        );
    }

    /** @return array{0: int, 1: int, 2: int} */
    protected function hexToRgb(string $hex): array
    {
        $hex = ltrim($hex, '#');
        if (strlen($hex) === 3) {
            $hex = $hex[0].$hex[0].$hex[1].$hex[1].$hex[2].$hex[2];
        }

        return [
            hexdec(substr($hex, 0, 2)),
            hexdec(substr($hex, 2, 2)),
            hexdec(substr($hex, 4, 2)),
        ];
    }
}

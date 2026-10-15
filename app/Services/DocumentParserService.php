<?php

namespace App\Services;

use ZipArchive;
use Spatie\PdfToText\Pdf as SpatiePdf;

class DocumentParserService
{
    /**
     * Parse a file and return extracted text.
     *
     * @param string $path Absolute path to file
     * @param string|null $mime
     * @return string
     */
    public function extractText(string $path, ?string $mime = null): string
    {
        $mime = $mime ?? mime_content_type($path);

        // PDF
        if (str_contains($mime, 'pdf') || str_ends_with(strtolower($path), '.pdf')) {
            try {
                if (class_exists(SpatiePdf::class)) {
                    return trim(SpatiePdf::getText($path));
                }
            } catch (\Exception $e) {
                // fallback to shell pdftotext if available
                try {
                    $escaped = escapeshellarg($path);
                    $output = null;
                    @exec("pdftotext -layout $escaped -", $output);
                    if (!empty($output)) {
                        return trim(implode("\n", $output));
                    }
                } catch (\Throwable $e) {
                    // ignore
                }
            }
            return '';
        }

        // DOCX (zip containing word/document.xml)
        if (str_contains($mime, 'officedocument') || str_ends_with(strtolower($path), '.docx')) {
            try {
                $zip = new ZipArchive();
                if ($zip->open($path) === true) {
                    $index = $zip->locateName('word/document.xml');
                    if ($index !== false) {
                        $xml = $zip->getFromIndex($index);
                        $zip->close();
                        // strip XML tags and return
                        $text = strip_tags($xml);
                        // Normalize whitespace
                        $text = preg_replace('/\s+/u', ' ', $text);
                        return trim($text);
                    }
                    $zip->close();
                }
            } catch (\Exception $e) {
                // ignore
            }
            return '';
        }

        // Plain text or other: try reading file
        try {
            $contents = @file_get_contents($path);
            return $contents !== false ? trim($contents) : '';
        } catch (\Throwable $e) {
            return '';
        }
    }
}

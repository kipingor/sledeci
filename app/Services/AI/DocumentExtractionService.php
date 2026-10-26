<?php

namespace App\Services\AI;

use App\Models\LeadDocument;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpWord\IOFactory;
use Smalot\PdfParser\Parser;

class DocumentExtractionService
{
    protected AiClientInterface $openAIClient;

    public function __construct(AiClientInterface $openAIClient)
    {
        $this->openAIClient = $openAIClient;
    }

    /**
     * Extract data from a lead document using AI
     */
    public function extract(LeadDocument $document): array
    {
        // Get document content
        $content = $this->getDocumentContent($document);

        if (empty($content)) {
            throw new \Exception('Unable to extract content from document');
        }

        // Prepare prompt for AI extraction
        $prompt = $this->buildExtractionPrompt($content, $document);

        // Call AI service
        $response = $this->openAIClient->chat($prompt, [
            'temperature' => 0.3, // Lower temperature for more consistent extraction
            'max_tokens' => 2000,
        ]);

        // Parse AI response
        $extractedData = $this->parseExtractionResponse($response);

        // Add metadata
        $extractedData['text'] = $content;
        $extractedData['document_id'] = $document->id;
        $extractedData['extraction_date'] = now()->toISOString();

        return $extractedData;
    }

    /**
     * Get document content based on file type
     */
    protected function getDocumentContent(LeadDocument $document): string
    {
        $filePath = Storage::disk('private')->path($document->storage_path);

        if (! file_exists($filePath)) {
            throw new \Exception('Document file not found');
        }

        $extension = strtolower(pathinfo($document->original_name ?? $document->filename ?? '', PATHINFO_EXTENSION));

        return match (true) {
            str_contains((string) $document->mime_type, 'pdf') || $extension === 'pdf' => $this->extractFromPdf($filePath),
            str_contains((string) $document->mime_type, 'word') || in_array($extension, ['doc', 'docx'], true) => $this->extractFromWord($filePath),
            str_contains((string) $document->mime_type, 'csv') || $extension === 'csv' => $this->extractFromCsv($filePath),
            str_contains((string) $document->mime_type, 'text') || $extension === 'txt' => file_get_contents($filePath),
            default => throw new \Exception('Unsupported file type: '.($document->mime_type ?? $extension)),
        };
    }

    /**
     * Extract text from PDF
     */
    protected function extractFromPdf(string $filePath): string
    {
        if (! class_exists(Parser::class)) {
            throw new \Exception('PDF extraction requires the smalot/pdfparser package.');
        }

        try {
            $parser = new Parser;
            $pdf = $parser->parseFile($filePath);

            return $pdf->getText();
        } catch (\Exception $e) {
            Log::error('PDF extraction failed', ['error' => $e->getMessage()]);
            throw new \Exception('Failed to extract text from PDF');
        }
    }

    /**
     * Extract text from Word document (.doc / .docx) using PhpWord.
     */
    protected function extractFromWord(string $filePath): string
    {
        if (! class_exists(IOFactory::class)) {
            throw new \Exception('Word extraction requires the phpoffice/phpword package.');
        }

        try {
            $reader = strtolower(pathinfo($filePath, PATHINFO_EXTENSION)) === 'doc' ? 'MsDoc' : 'Word2007';
            $phpWord = IOFactory::load($filePath, $reader);

            $lines = [];
            foreach ($phpWord->getSections() as $section) {
                foreach ($section->getElements() as $element) {
                    $text = $this->extractTextFromElement($element);
                    if ($text !== '') {
                        $lines[] = $text;
                    }
                }
            }

            return trim(implode("\n", $lines));
        } catch (\Exception $e) {
            Log::error('Word extraction failed', ['error' => $e->getMessage()]);
            throw new \Exception('Failed to extract text from Word document');
        }
    }

    /**
     * Recursively pull text out of a PhpWord element (Text, TextRun, Table ...).
     */
    private function extractTextFromElement(object $element): string
    {
        if (method_exists($element, 'getText') && is_string($text = $element->getText())) {
            return $text;
        }

        $parts = [];
        if (method_exists($element, 'getElements')) {
            foreach ($element->getElements() as $child) {
                $parts[] = $this->extractTextFromElement($child);
            }
        } elseif (method_exists($element, 'getRows')) {
            foreach ($element->getRows() as $row) {
                foreach ($row->getCells() as $cell) {
                    foreach ($cell->getElements() as $child) {
                        $parts[] = $this->extractTextFromElement($child);
                    }
                }
            }
        }

        return trim(implode(' ', array_filter($parts, fn ($p) => $p !== '')));
    }

    /**
     * Extract content from CSV
     */
    protected function extractFromCsv(string $filePath): string
    {
        $content = [];
        $file = fopen($filePath, 'r');

        while (($row = fgetcsv($file)) !== false) {
            $content[] = implode(' | ', $row);
        }

        fclose($file);

        return implode("\n", $content);
    }

    /**
     * Build extraction prompt for AI
     */
    protected function buildExtractionPrompt(string $content, LeadDocument $document): string
    {
        return <<<PROMPT
You are an expert at extracting structured information from business documents.
Analyze the following document and extract key information in JSON format.

Document Type: {$document->mime_type}
Document Name: {$document->original_name}

Extract the following information if present:
1. entities: Array of people, companies, locations mentioned
2. keywords: Array of important keywords/topics
3. budget: Any budget or monetary values mentioned (as number)
4. timeline: Any dates, deadlines, or timeline information
5. requirements: List of requirements, specifications, or needs
6. summary: Brief 2-3 sentence summary of the document
7. confidence: Your confidence level in the extraction (0-100)

Document Content:
{$content}

Return ONLY valid JSON with the structure:
{
  "entities": [],
  "keywords": [],
  "budget": null,
  "timeline": null,
  "requirements": [],
  "summary": "",
  "confidence": 0
}
PROMPT;
    }

    /**
     * Parse AI response into structured data
     */
    protected function parseExtractionResponse(string $response): array
    {
        try {
            // Remove markdown code blocks if present
            $response = preg_replace('/```json\s*|\s*```/', '', $response);

            $data = json_decode($response, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new \Exception('Invalid JSON response from AI');
            }

            // Ensure all expected fields exist
            return [
                'entities' => $data['entities'] ?? [],
                'keywords' => $data['keywords'] ?? [],
                'budget' => $data['budget'] ?? null,
                'timeline' => $data['timeline'] ?? null,
                'requirements' => $data['requirements'] ?? [],
                'summary' => $data['summary'] ?? '',
                'confidence' => $data['confidence'] ?? 0,
            ];

        } catch (\Exception $e) {
            Log::error('Failed to parse extraction response', [
                'error' => $e->getMessage(),
                'response' => $response,
            ]);

            // Return empty structure
            return [
                'entities' => [],
                'keywords' => [],
                'budget' => null,
                'timeline' => null,
                'requirements' => [],
                'summary' => '',
                'confidence' => 0,
            ];
        }
    }

    /**
     * Extract specific field from document
     */
    public function extractField(LeadDocument $document, string $field): ?string
    {
        $content = $this->getDocumentContent($document);

        $prompt = <<<PROMPT
Extract only the {$field} from the following document.
Return only the extracted value, nothing else.

Document:
{$content}
PROMPT;

        return $this->openAIClient->chat($prompt, [
            'temperature' => 0.2,
            'max_tokens' => 200,
        ]);
    }

    /**
     * Summarize document
     */
    public function summarize(LeadDocument $document, int $maxLength = 200): string
    {
        $content = $this->getDocumentContent($document);

        $prompt = <<<PROMPT
Summarize the following document in no more than {$maxLength} words.
Focus on the key points and main purpose.

Document:
{$content}
PROMPT;

        return $this->openAIClient->chat($prompt, [
            'temperature' => 0.5,
            'max_tokens' => $maxLength * 2, // Rough estimate for tokens
        ]);
    }

    /**
     * Classify document type
     */
    public function classifyDocumentType(LeadDocument $document): string
    {
        $content = $this->getDocumentContent($document);
        $preview = substr($content, 0, 1000); // First 1000 characters

        $prompt = <<<PROMPT
Classify the type of this business document. Choose ONE from:
- RFP (Request for Proposal)
- RFQ (Request for Quote)
- Contract
- Invoice
- Specification
- Requirements Document
- Business Plan
- Other

Document preview:
{$preview}

Return only the classification, nothing else.
PROMPT;

        return trim($this->openAIClient->chat($prompt, [
            'temperature' => 0.1,
            'max_tokens' => 50,
        ]));
    }
}

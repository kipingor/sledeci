<?php

namespace App\Services\Tender;

use App\Models\Lead;
use App\Models\Opportunity;
use App\Models\Project;
use App\Models\Tender;
use App\Services\AI\AiClientInterface;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpWord\IOFactory;
use Smalot\PdfParser\Parser;

class TenderAgentService
{
    public function __construct(
        private AiClientInterface $ai
    ) {}

    /**
     * Full document analysis — called after upload.
     * Populates extracted_data, ai_analysis, checklist, information_gaps.
     */
    public function analyze(Tender $tender): Tender
    {
        $tender->update(['analysis_status' => 'processing']);

        $docText = $this->readDocument($tender);

        if (empty(trim($docText))) {
            Log::warning('TenderAgentService: could not read document text', ['tender_id' => $tender->id]);
            $docText = "Title: {$tender->title}\nIssuer: {$tender->issuer}\nReference: {$tender->reference_number}";
        }

        try {
            $extracted = $this->extractStructuredData($docText, $tender);
            $analysis = $this->buildStrategicAnalysis($docText, $extracted);
            $checklist = $this->buildChecklist($extracted);
            $gaps = $this->identifyInformationGaps($docText, $extracted);

            // Back-fill fields from extracted data if not already set
            $updates = [
                'extracted_data' => $extracted,
                'ai_analysis' => $analysis,
                'checklist' => $checklist,
                'information_gaps' => $gaps,
                'analysis_status' => 'completed',
            ];
            if (! $tender->issuer && ! empty($extracted['issuer'])) {
                $updates['issuer'] = $extracted['issuer'];
            }
            if (! $tender->reference_number && ! empty($extracted['reference_number'])) {
                $updates['reference_number'] = $extracted['reference_number'];
            }
            if (! $tender->submission_deadline && ! empty($extracted['submission_deadline'])) {
                try {
                    $updates['submission_deadline'] = Carbon::parse($extracted['submission_deadline'])->toDateString();
                } catch (\Exception $e) {
                }
            }
            if (! $tender->estimated_value && ! empty($extracted['estimated_budget'])) {
                $val = preg_replace('/[^0-9.]/', '', (string) $extracted['estimated_budget']);
                if ($val) {
                    $updates['estimated_value'] = (float) $val;
                }
            }

            $tender->update($updates);

        } catch (\Exception $e) {
            Log::error('TenderAgentService::analyze failed', ['tender_id' => $tender->id, 'error' => $e->getMessage()]);
            $tender->update(['analysis_status' => 'failed']);
        }

        return $tender->refresh();
    }

    /**
     * Generate a specific bid document.
     */
    public function generateDocument(Tender $tender, string $type, ?string $additionalContext = null): array
    {
        $labels = [
            'cover_letter' => 'Cover Letter',
            'capability_statement' => 'Capability Statement',
            'compliance_matrix' => 'Compliance Matrix',
            'executive_summary' => 'Executive Summary',
            'methodology' => 'Proposed Methodology',
            'pricing_schedule' => 'Pricing Schedule',
        ];

        $label = $labels[$type] ?? ucwords(str_replace('_', ' ', $type));
        $extractedJson = json_encode($tender->extracted_data ?? [], JSON_PRETTY_PRINT);
        $analysisJson = json_encode($tender->ai_analysis ?? [], JSON_PRETTY_PRINT);
        $answeredGaps = $this->formatAnsweredGaps($tender);

        $additionalInstructions = $additionalContext ? "Additional instructions:\n{$additionalContext}" : '';
        $prompt = <<<PROMPT
You are an expert tender writer. Generate a professional {$label} for this bid.

Tender: {$tender->title}
Issuer: {$tender->issuer}
Reference: {$tender->reference_number}

Extracted requirements:
{$extractedJson}

Strategic analysis:
{$analysisJson}

{$answeredGaps}
{$additionalInstructions}

Produce a complete, professional {$label} that:
- Directly addresses stated requirements and evaluation criteria
- Demonstrates our capabilities and relevant experience
- Uses formal business language appropriate for a tender response
- Is formatted with clear headings and sections

Return the document in markdown with proper headings (## for major sections).
PROMPT;

        $content = $this->ai->chat($prompt, ['max_tokens' => 2000, 'temperature' => 0.4]);

        $doc = [
            'type' => $type,
            'title' => $label,
            'content' => $content,
            'created_at' => now()->toISOString(),
        ];

        $docs = $tender->generated_documents ?? [];
        $idx = array_search($type, array_column($docs, 'type'));
        if ($idx !== false) {
            $docs[$idx] = $doc;
        } else {
            $docs[] = $doc;
        }

        $tender->update([
            'generated_documents' => $docs,
            'status' => $tender->status === 'reviewing' ? 'drafting' : $tender->status,
        ]);

        return $doc;
    }

    /**
     * Conversational agent chat — persists history on the tender record.
     */
    public function chat(Tender $tender, string $userMessage): string
    {
        $history = $tender->agent_conversation ?? [];

        // Build message array: system + history + new user message
        $systemPrompt = $this->buildSystemPrompt($tender);

        // Flatten into a single prompt with system context prepended
        // (uses the AiClientInterface single-string chat method)
        $conversationText = $systemPrompt."\n\n---\n\n";
        foreach ($history as $msg) {
            $prefix = strtoupper($msg['role'] ?? 'user').': ';
            $conversationText .= $prefix.($msg['content'] ?? '')."\n\n";
        }
        $conversationText .= "USER: {$userMessage}\n\nASSISTANT:";

        $response = $this->ai->chat($conversationText, ['max_tokens' => 800, 'temperature' => 0.5]);

        // Persist
        $history[] = ['role' => 'user',      'content' => $userMessage, 'created_at' => now()->toISOString()];
        $history[] = ['role' => 'assistant', 'content' => $response,    'created_at' => now()->toISOString()];
        $tender->update(['agent_conversation' => $history]);

        return $response;
    }

    /**
     * Answer a specific information gap.
     */
    public function answerGap(Tender $tender, int $gapIndex, string $answer): void
    {
        $gaps = $tender->information_gaps ?? [];
        if (isset($gaps[$gapIndex])) {
            $gaps[$gapIndex]['answer'] = $answer;
            $gaps[$gapIndex]['resolved'] = true;
        }
        $tender->update(['information_gaps' => $gaps]);
    }

    /**
     * Toggle a checklist item done/undone.
     */
    public function toggleChecklistItem(Tender $tender, int $itemIndex, bool $done): void
    {
        $checklist = $tender->checklist ?? [];
        if (isset($checklist[$itemIndex])) {
            $checklist[$itemIndex]['done'] = $done;
        }
        $tender->update(['checklist' => $checklist]);
    }

    /**
     * Convert a won tender into a Project.
     */
    public function convertToProject(Tender $tender, array $extra = []): Project
    {
        $extracted = $tender->extracted_data ?? [];

        $project = Project::create([
            'name' => $tender->title,
            'description' => implode("\n\n", array_filter([
                $tender->ai_analysis['summary'] ?? null,
                $tender->notes,
            ])),
            'status' => 'active',
            'owner_id' => $tender->owner_id,
            'start_date' => now()->toDateString(),
            'end_date' => $extracted['project_timeline']['end_date'] ?? null,
            'budget' => $tender->estimated_value,
            'metadata' => [
                'source' => 'tender',
                'tender_id' => $tender->id,
                'tender_reference' => $tender->reference_number,
                'issuer' => $tender->issuer,
            ],
            ...$extra,
        ]);

        $tender->update(['project_id' => $project->id, 'status' => 'won']);

        return $project;
    }

    /**
     * Create a Lead + Opportunity so the tender flows through the sales pipeline.
     */
    public function createLeadAndOpportunity(Tender $tender): array
    {
        $lead = Lead::create([
            'title' => "Tender: {$tender->title}",
            'description' => $tender->ai_analysis['summary'] ?? $tender->notes ?? '',
            'status' => 'new',
            'type' => 'manual',
            'created_by' => Auth::id(),
            'owner_id' => $tender->owner_id,
            'metadata' => ['source' => 'tender', 'tender_id' => $tender->id],
        ]);

        $opportunity = Opportunity::create([
            'lead_id' => $lead->id,
            'owner_id' => $tender->owner_id,
            'title' => $tender->title,
            'summary' => $tender->ai_analysis['summary'] ?? '',
            'estimated_value' => $tender->estimated_value,
            'stage' => 'proposal',
            'status' => 'open',
            'metadata' => [
                'source' => 'tender',
                'tender_id' => $tender->id,
                'issuer' => $tender->issuer,
                'deadline' => $tender->submission_deadline?->toDateString(),
            ],
        ]);

        $tender->update([
            'lead_id' => $lead->id,
            'opportunity_id' => $opportunity->id,
        ]);

        return compact('lead', 'opportunity');
    }

    // ── Private helpers ───────────────────────────────────────────────────

    private function readDocument(Tender $tender): string
    {
        if (! $tender->document_path) {
            return '';
        }
        try {
            $path = Storage::disk('private')->path($tender->document_path);
            if (! file_exists($path)) {
                return '';
            }
            $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
            if (in_array($ext, ['txt', 'md'])) {
                return file_get_contents($path);
            }
            if ($ext === 'pdf' && class_exists(Parser::class)) {
                return (new Parser)->parseFile($path)->getText();
            }
            if (in_array($ext, ['docx', 'doc']) && class_exists(IOFactory::class)) {
                return $this->readWordDocument($path, $ext);
            }

            return file_get_contents($path);
        } catch (\Exception $e) {
            Log::warning('TenderAgentService: read failed', ['error' => $e->getMessage()]);

            return '';
        }
    }

    /**
     * Extract plain text from a Word document using PhpWord.
     */
    private function readWordDocument(string $path, string $ext): string
    {
        $reader = $ext === 'doc' ? 'MsDoc' : 'Word2007';
        $phpWord = IOFactory::load($path, $reader);

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
    }

    /**
     * Recursively pull text out of a PhpWord element (Text, TextRun, Table, etc.).
     */
    private function extractTextFromElement($element): string
    {
        if (method_exists($element, 'getText')) {
            $text = $element->getText();
            if (is_string($text)) {
                return $text;
            }
        }

        $parts = [];
        if (method_exists($element, 'getElements')) {
            foreach ($element->getElements() as $child) {
                $parts[] = $this->extractTextFromElement($child);
            }
        } elseif (method_exists($element, 'getRows')) { // Tables
            foreach ($element->getRows() as $row) {
                foreach ($row->getCells() as $cell) {
                    foreach ($cell->getElements() as $child) {
                        $parts[] = $this->extractTextFromElement($child);
                    }
                }
            }
        }

        return trim(implode(' ', array_filter($parts, fn ($p) => is_string($p) && $p !== '')));
    }

    private function extractStructuredData(string $docText, Tender $tender): array
    {
        $snippet = mb_substr($docText, 0, 8000);

        $prompt = <<<PROMPT
Analyse this tender/RFP document. Extract key information as JSON.

Document:
{$snippet}

Return ONLY a JSON object (null for missing fields):
{
  "issuer": "Organisation name",
  "reference_number": "Tender ref",
  "submission_deadline": "YYYY-MM-DD",
  "submission_method": "How to submit",
  "estimated_budget": 0,
  "currency": "USD",
  "scope_of_work": ["deliverable 1", "deliverable 2"],
  "evaluation_criteria": [{"criterion": "...", "weight": "..."}],
  "eligibility_requirements": ["requirement 1"],
  "required_documents": ["document 1"],
  "contact_person": {"name": null, "email": null, "phone": null},
  "project_timeline": {"start_date": null, "end_date": null, "duration": null},
  "special_conditions": ["condition 1"]
}

Return ONLY valid JSON.
PROMPT;

        try {
            $raw = $this->ai->chat($prompt, ['max_tokens' => 1200, 'temperature' => 0.2]);
            $raw = preg_replace('/```json\s*|\s*```/', '', trim($raw));
            $data = json_decode($raw, true);

            return is_array($data) ? $data : [];
        } catch (\Exception $e) {
            return [];
        }
    }

    private function buildStrategicAnalysis(string $docText, array $extracted): array
    {
        $json = json_encode($extracted, JSON_PRETTY_PRINT);
        $snippet = mb_substr($docText, 0, 5000);

        $prompt = <<<PROMPT
You are a strategic bid consultant. Assess this tender opportunity.

Extracted data:
{$json}

Document excerpt:
{$snippet}

Return ONLY a JSON object:
{
  "summary": "2-3 sentence executive summary",
  "opportunity_score": 75,
  "strengths": ["Our strong fit areas"],
  "risks": ["Potential challenges"],
  "recommended_approach": "2-3 sentence strategy",
  "win_themes": ["Theme 1", "Theme 2", "Theme 3"],
  "estimated_effort": "e.g. Medium — 3-4 weeks"
}

Return ONLY valid JSON.
PROMPT;

        try {
            $raw = $this->ai->chat($prompt, ['max_tokens' => 800, 'temperature' => 0.4]);
            $raw = preg_replace('/```json\s*|\s*```/', '', trim($raw));
            $data = json_decode($raw, true);

            return is_array($data) ? $data : [];
        } catch (\Exception $e) {
            return [];
        }
    }

    private function buildChecklist(array $extracted): array
    {
        $requiredDocs = $extracted['required_documents'] ?? [];
        $eligibility = $extracted['eligibility_requirements'] ?? [];
        $docsJson = json_encode($requiredDocs);
        $eligJson = json_encode($eligibility);

        $prompt = <<<PROMPT
Create a comprehensive submission checklist for a tender bid.

Required documents from tender: {$docsJson}
Eligibility requirements: {$eligJson}

Return ONLY a JSON array. Each item:
{"id": "unique_slug", "category": "Documents|Compliance|Technical|Financial|Administrative", "label": "Action item", "done": false, "notes": ""}

Include all required docs, compliance items, and standard administrative tasks like internal review and submission.
Return ONLY valid JSON array.
PROMPT;

        try {
            $raw = $this->ai->chat($prompt, ['max_tokens' => 1000, 'temperature' => 0.2]);
            $raw = preg_replace('/```json\s*|\s*```/', '', trim($raw));
            $items = json_decode($raw, true);

            return is_array($items) ? $items : $this->defaultChecklist();
        } catch (\Exception $e) {
            return $this->defaultChecklist();
        }
    }

    private function identifyInformationGaps(string $docText, array $extracted): array
    {
        $json = json_encode($extracted, JSON_PRETTY_PRINT);
        $snippet = mb_substr($docText, 0, 4000);

        $prompt = <<<PROMPT
Review this tender document. Identify information WE (the bidder) must provide or confirm internally.

Extracted data:
{$json}

Document excerpt:
{$snippet}

Return ONLY a JSON array of information gaps — things we need to source internally. Each item:
{"id": "unique_slug", "category": "Company Info|Technical|Financial|Legal|Experience", "question": "What specific info is needed?", "why_needed": "Why this is required", "answer": null, "resolved": false}

Focus on things like: company registration, certifications, key personnel CVs, case studies, financial statements — not things in the tender doc itself.
Return ONLY valid JSON array.
PROMPT;

        try {
            $raw = $this->ai->chat($prompt, ['max_tokens' => 800, 'temperature' => 0.3]);
            $raw = preg_replace('/```json\s*|\s*```/', '', trim($raw));
            $data = json_decode($raw, true);

            return is_array($data) ? $data : [];
        } catch (\Exception $e) {
            return [];
        }
    }

    private function buildSystemPrompt(Tender $tender): string
    {
        $extracted = json_encode($tender->extracted_data ?? [], JSON_PRETTY_PRINT);
        $analysis = json_encode($tender->ai_analysis ?? [], JSON_PRETTY_PRINT);
        $progress = $tender->checklistProgress();
        $gaps = $tender->unresolvedGaps();

        return <<<PROMPT
You are an expert bid consultant and tender agent helping to WIN this tender.

TENDER: {$tender->title}
ISSUER: {$tender->issuer}
REFERENCE: {$tender->reference_number}
DEADLINE: {$tender->submission_deadline?->format('d M Y')}
STATUS: {$tender->status}
CHECKLIST: {$progress['done']}/{$progress['total']} items complete ({$progress['percent']}%)
UNRESOLVED INFO GAPS: {$gaps}

REQUIREMENTS:
{$extracted}

STRATEGIC ANALYSIS:
{$analysis}

Your role: Guide the user step by step through the tender response.
- Suggest what to do next based on current progress
- Help draft and refine bid documents on request
- Flag risks and time pressures
- Answer questions about the requirements
- Be specific and actionable — not generic
- Always focus on winning this bid
PROMPT;
    }

    private function formatAnsweredGaps(Tender $tender): string
    {
        $answered = array_filter($tender->information_gaps ?? [], fn ($g) => $g['resolved'] ?? false);
        if (empty($answered)) {
            return '';
        }
        $lines = array_map(fn ($g) => "- {$g['question']}: {$g['answer']}", $answered);

        return "Bidder information provided:\n".implode("\n", $lines);
    }

    private function defaultChecklist(): array
    {
        return [
            ['id' => 'cover_letter',        'category' => 'Documents',      'label' => 'Write cover letter',                     'done' => false, 'notes' => ''],
            ['id' => 'capability_statement', 'category' => 'Documents',      'label' => 'Prepare capability statement',            'done' => false, 'notes' => ''],
            ['id' => 'company_registration', 'category' => 'Compliance',     'label' => 'Attach company registration certificate', 'done' => false, 'notes' => ''],
            ['id' => 'tax_clearance',        'category' => 'Compliance',     'label' => 'Obtain current tax clearance certificate', 'done' => false, 'notes' => ''],
            ['id' => 'case_studies',         'category' => 'Technical',      'label' => 'Prepare 3 relevant case studies',         'done' => false, 'notes' => ''],
            ['id' => 'pricing',              'category' => 'Financial',      'label' => 'Complete pricing schedule',               'done' => false, 'notes' => ''],
            ['id' => 'review',               'category' => 'Administrative', 'label' => 'Internal review and sign-off',            'done' => false, 'notes' => ''],
            ['id' => 'submit',               'category' => 'Administrative', 'label' => 'Submit before deadline',                  'done' => false, 'notes' => ''],
        ];
    }
}

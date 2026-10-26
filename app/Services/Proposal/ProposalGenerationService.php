<?php

namespace App\Services\Proposal;

use App\Models\Proposal;
use App\Models\Lead;
use App\Services\AI\AiClientInterface;
use App\Events\ProposalGenerated;
use App\Events\ProposalSent;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class ProposalGenerationService
{
    public function __construct(
        protected AiClientInterface $openAIClient
    ) {}

    /**
     * Generate a proposal using AI
     *
     * @param Lead $lead
     * @param array $options
     * @return Proposal
     */
    public function generate(Lead $lead, array $options = []): Proposal
    {
        return DB::transaction(function () use ($lead, $options) {
            // Build context from lead data
            $context = $this->buildLeadContext($lead);

            // Generate proposal content using AI
            $content = $this->generateContent($context, $options);

            // Create proposal record
            $proposal = Proposal::create([
                'lead_id' => $lead->id,
                'title' => $this->generateTitle($lead, $options),
                'content' => $content,
                'status' => 'draft',
                'generated_by_ai' => true,
                'generation_options' => $options,
                'metadata' => [
                    'template' => $options['template'] ?? 'standard',
                    'tone' => $options['tone'] ?? 'professional',
                    'length' => $options['length'] ?? 'standard',
                    'generated_at' => now()->toISOString(),
                ],
            ]);

            event(new ProposalGenerated($proposal->id));

            return $proposal->load('lead');
        });
    }

    /**
     * Build context from lead data for AI generation
     */
    protected function buildLeadContext(Lead $lead): array
    {
        $lead->load(['leadDocuments', 'questions', 'owner', 'pipelineStage']);

        $context = [
            'lead_title' => $lead->title,
            'lead_description' => $lead->description,
            'lead_type' => $lead->type->label(),
        ];

        // Add extracted document information
        $documentInfo = [];
        foreach ($lead->leadDocuments as $document) {
            if ($document->extracted_text) {
                $documentInfo[] = [
                    'filename' => $document->file_name,
                    'summary' => substr($document->extracted_text, 0, 500),
                ];
            }
        }
        $context['documents'] = $documentInfo;

        // Add Q&A information
        $qaInfo = [];
        foreach ($lead->questions as $question) {
            if ($question->answer) {
                $qaInfo[] = [
                    'question' => $question->question,
                    'answer' => $question->answer,
                ];
            }
        }
        $context['questions_and_answers'] = $qaInfo;

        // Add metadata
        if ($lead->metadata) {
            $context['metadata'] = $lead->metadata;
        }

        return $context;
    }

    /**
     * Generate proposal content using AI
     */
    protected function generateContent(array $context, array $options): string
    {
        $template = $options['template'] ?? 'standard';
        $tone = $options['tone'] ?? 'professional';
        $length = $options['length'] ?? 'standard';
        $includePricing = $options['include_pricing'] ?? true;
        $customInstructions = $options['custom_instructions'] ?? null;

        $prompt = $this->buildPrompt($context, $template, $tone, $length, $includePricing, $customInstructions);

        try {
            $content = $this->openAIClient->chat($prompt, [
                'model' => 'gpt-5',
                'temperature' => 0.7,
                'max_tokens' => $this->getMaxTokensForLength($length),
            ]);

            return $content;
        } catch (\Exception $e) {
            Log::error('Proposal generation failed', [
                'error' => $e->getMessage(),
                'lead_id' => $context['lead_id'] ?? null,
            ]);

            throw new \Exception('Failed to generate proposal: ' . $e->getMessage());
        }
    }

    /**
     * Build AI prompt for proposal generation
     */
    protected function buildPrompt(
        array $context,
        string $template,
        string $tone,
        string $length,
        bool $includePricing,
        ?string $customInstructions
    ): string {
        $promptParts = [];

        // System instruction
        $promptParts[] = "You are an expert business proposal writer. Generate a professional, compelling proposal based on the provided information.";

        // Template instruction
        $templateInstructions = match ($template) {
            'technical' => "Create a technical proposal with detailed specifications, implementation plans, and technical methodology.",
            'executive' => "Create an executive proposal focused on strategic value, ROI, and high-level benefits. Keep it concise and business-focused.",
            default => "Create a standard business proposal with problem statement, proposed solution, benefits, timeline, and next steps.",
        };
        $promptParts[] = $templateInstructions;

        // Tone instruction
        $toneInstructions = match ($tone) {
            'formal' => "Use formal, corporate language. Be professional and authoritative.",
            'friendly' => "Use friendly, approachable language while maintaining professionalism.",
            default => "Use professional, clear language that builds confidence and trust.",
        };
        $promptParts[] = $toneInstructions;

        // Length instruction
        $lengthInstructions = match ($length) {
            'brief' => "Keep the proposal brief and to the point (1-2 pages).",
            'detailed' => "Create a comprehensive, detailed proposal (4-6 pages) with thorough explanations.",
            default => "Create a standard-length proposal (2-3 pages) with appropriate detail.",
        };
        $promptParts[] = $lengthInstructions;

        // Context
        $promptParts[] = "\n### Lead Information:";
        $promptParts[] = "Title: " . ($context['lead_title'] ?? 'Untitled');

        if (!empty($context['lead_description'])) {
            $promptParts[] = "Description: " . $context['lead_description'];
        }

        // Documents
        if (!empty($context['documents'])) {
            $promptParts[] = "\n### Relevant Documents:";
            foreach ($context['documents'] as $doc) {
                $promptParts[] = "- {$doc['filename']}: {$doc['summary']}";
            }
        }

        // Q&A
        if (!empty($context['questions_and_answers'])) {
            $promptParts[] = "\n### Questions & Answers:";
            foreach ($context['questions_and_answers'] as $qa) {
                $promptParts[] = "Q: {$qa['question']}";
                $promptParts[] = "A: {$qa['answer']}";
            }
        }

        // Metadata
        if (!empty($context['metadata'])) {
            $promptParts[] = "\n### Additional Context:";
            if (isset($context['metadata']['budget'])) {
                $promptParts[] = "Budget: " . $context['metadata']['budget'];
            }
            if (isset($context['metadata']['timeline'])) {
                $promptParts[] = "Timeline: " . $context['metadata']['timeline'];
            }
            if (isset($context['metadata']['requirements'])) {
                $requirements = $context['metadata']['requirements'];

                // Handle both string and array
                if (is_array($requirements)) {
                    $promptParts[] = "Requirements: " . implode(', ', $requirements);
                } else {
                    $promptParts[] = "Requirements: " . $requirements;
                }
            }
        }

        // Pricing instruction
        if ($includePricing) {
            $promptParts[] = "\nInclude a pricing section with estimated costs and payment terms.";
            $promptParts[] = "1. Executive Summary";
            $promptParts[] = "2. Project Scope";
            $promptParts[] = "3. Deliverables";
            $promptParts[] = "4. Timeline";
            $promptParts[] = "5. Pricing";
            $promptParts[] = "6. Terms and Conditions";
        }

        // Custom instructions
        if ($customInstructions) {
            $promptParts[] = "\n### Special Instructions:";
            $promptParts[] = $customInstructions;
        }

        // Final instruction
        $promptParts[] = "\nGenerate a complete, professional proposal in Markdown format with appropriate sections and formatting.";

        return implode("\n", $promptParts);
    }

    /**
     * Generate proposal title
     */
    protected function generateTitle(Lead $lead, array $options): string
    {
        $template = $options['template'] ?? 'standard';

        $prefix = match ($template) {
            'technical' => 'Technical Proposal',
            'executive' => 'Executive Proposal',
            default => 'Business Proposal',
        };

        return "{$prefix}: {$lead->title}";
    }

    /**
     * Get max tokens based on desired length
     */
    protected function getMaxTokensForLength(string $length): int
    {
        return match ($length) {
            'brief' => 1500,
            'detailed' => 4000,
            default => 2500,
        };
    }

    /**
     * Regenerate an existing proposal
     */
    public function regenerate(Proposal $proposal, ?string $customInstructions = null): Proposal
    {
        $options = $proposal->generation_options ?? [];

        if ($customInstructions) {
            $options['custom_instructions'] = $customInstructions;
        }

        // Generate new version
        $newProposal = $this->generate($proposal->lead, $options);

        // Mark old proposal as superseded
        $proposal->update([
            'metadata' => array_merge($proposal->metadata ?? [], [
                'superseded_by' => $newProposal->id,
                'superseded_at' => now()->toISOString(),
            ]),
        ]);

        return $newProposal;
    }

    /**
     * Send proposal via email
     */
    public function send(Proposal $proposal, string $email, ?string $subject = null, ?string $message = null): void
    {
        DB::transaction(function () use ($proposal, $email, $subject, $message) {
            // Send email (implement actual mail sending based on your mail setup)
            Mail::send('emails.proposal', [
                'proposal' => $proposal,
                'message' => $message,
            ], function ($mail) use ($email, $subject, $proposal) {
                $mail->to($email)
                    ->subject($subject ?? "Proposal: {$proposal->title}");
            });

            // Update proposal
            $proposal->update([
                'status' => 'sent',
                'sent_at' => now(),
                'sent_to' => $email,
            ]);

            event(new ProposalSent($proposal));
        });
    }

    /**
     * Export proposal to PDF
     */
    public function exportToPdf(Proposal $proposal): string
    {
        // This would use a PDF library like DomPDF or wkhtmltopdf
        // For now, return a placeholder

        $html = $this->convertMarkdownToHtml($proposal->content);

        // Use PDF generation library
        // $pdf = PDF::loadHTML($html);
        // $pdfPath = storage_path("proposals/proposal-{$proposal->id}.pdf");
        // $pdf->save($pdfPath);

        // return $pdfPath;

        return 'pdf-generation-placeholder';
    }

    /**
     * Convert Markdown to HTML
     */
    protected function convertMarkdownToHtml(string $markdown): string
    {
        // Use a Markdown parser like Parsedown
        // $parsedown = new Parsedown();
        // return $parsedown->text($markdown);

        // Placeholder
        return nl2br(e($markdown));
    }

    /**
     * Get proposal templates
     */
    public function getTemplates(): array
    {
        return [
            'standard' => [
                'name' => 'Standard Business Proposal',
                'description' => 'A comprehensive business proposal with all standard sections',
                'sections' => [
                    'Executive Summary',
                    'Problem Statement',
                    'Proposed Solution',
                    'Benefits & Value',
                    'Timeline',
                    'Pricing',
                    'Next Steps',
                ],
            ],
            'technical' => [
                'name' => 'Technical Proposal',
                'description' => 'Detailed technical specifications and implementation plan',
                'sections' => [
                    'Technical Overview',
                    'Requirements Analysis',
                    'Technical Approach',
                    'Implementation Plan',
                    'Technical Specifications',
                    'Testing & QA',
                    'Timeline & Milestones',
                    'Pricing & Resources',
                ],
            ],
            'executive' => [
                'name' => 'Executive Proposal',
                'description' => 'High-level strategic proposal for executive audiences',
                'sections' => [
                    'Executive Summary',
                    'Strategic Alignment',
                    'ROI & Business Value',
                    'High-Level Approach',
                    'Investment Required',
                    'Recommendation',
                ],
            ],
        ];
    }

    /**
     * Validate proposal content
     */
    public function validate(Proposal $proposal): array
    {
        $issues = [];

        // Check length
        $wordCount = str_word_count(strip_tags($proposal->content));
        if ($wordCount < 100) {
            $issues[] = 'Proposal is too short (less than 100 words)';
        }

        // Check for required sections (basic check)
        $requiredKeywords = ['solution', 'benefit', 'timeline', 'price', 'cost', 'next'];
        $content = strtolower($proposal->content);

        foreach ($requiredKeywords as $keyword) {
            if (strpos($content, $keyword) === false) {
                $issues[] = "Missing '{$keyword}' section or content";
            }
        }

        return [
            'valid' => empty($issues),
            'issues' => $issues,
            'word_count' => $wordCount,
        ];
    }

    /**
     * Get proposal statistics
     */
    public function getStatistics(): array
    {
        return [
            'total' => Proposal::count(),
            'by_status' => [
                'draft' => Proposal::where('status', 'draft')->count(),
                'sent' => Proposal::where('status', 'sent')->count(),
                'accepted' => Proposal::where('status', 'accepted')->count(),
                'rejected' => Proposal::where('status', 'rejected')->count(),
            ],
            'ai_generated' => Proposal::where('generated_by_ai', true)->count(),
            'acceptance_rate' => $this->calculateAcceptanceRate(),
        ];
    }

    /**
     * Calculate acceptance rate
     */
    protected function calculateAcceptanceRate(): float
    {
        $sent = Proposal::whereIn('status', ['accepted', 'rejected'])->count();
        $accepted = Proposal::where('status', 'accepted')->count();

        return $sent > 0 ? round(($accepted / $sent) * 100, 2) : 0;
    }
}

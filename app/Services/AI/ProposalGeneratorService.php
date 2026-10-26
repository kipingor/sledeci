<?php

namespace App\Services\AI;

use App\Models\Opportunity;
use Exception;

class ProposalGeneratorService
{
    public function __construct(
        private AiClientInterface $client
    ) {
    }

    /**
     * Generate a proposal outline and draft from an Opportunity record.
     * Returns an array with 'outline' and 'draft'.
     *
     * @param Opportunity $opportunity
     * @param array $options
     * @return array
     * @throws Exception
     */
    public function generateFromOpportunity(Opportunity $opportunity, array $options = []): array
    {
        $requirements = $opportunity->lead && !empty($opportunity->lead->metadata) ? $opportunity->lead->metadata : [];
        $context = $opportunity->summary ?? '';

        $promptBase = "You are a professional proposal writer. Create a clear proposal outline and a full proposal draft for the following opportunity.\n\nOpportunity context:\n" . $context . "\n\nRequirements:\n" . json_encode($requirements);

        try {
            $outline = $this->client->chat(
                "Create a numbered outline for the proposal:\n\n" . $promptBase,
                array_merge(['max_tokens' => 800], $options)
            );
            $draft = $this->client->chat(
                "Write a full professional proposal (cover letter, scope, deliverables, timeline, cost estimate, T&Cs):\n\n" . $promptBase,
                array_merge(['max_tokens' => 1500], $options)
            );
        } catch (Exception $e) {
            throw new Exception("Failed to generate proposal: " . $e->getMessage());
        }

        // Store suggestions on the opportunity
        $opportunity->ai_suggestions = [
            'proposal_outline' => $outline,
            'proposal_draft' => $draft,
        ];
        $opportunity->save();

        return ['outline' => $outline, 'draft' => $draft];
    }
}
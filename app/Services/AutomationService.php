<?php

namespace App\Services;

use App\Models\AutomationRule;
use App\Models\Lead;
use App\Models\Opportunity;
use Illuminate\Support\Facades\Log;

class AutomationService
{
    /**
     * Handle lead status changed event.
     */
    public function handleLeadStatusChanged(Lead $lead, string $oldStatus): void
    {
        $rules = AutomationRule::active()
            ->byTrigger('lead_status_changed')
            ->get();

        foreach ($rules as $rule) {
            $triggerData = [
                'status' => $lead->status->value,
                'old_status' => $oldStatus,
            ];

            if ($rule->matchesConditions($triggerData)) {
                try {
                    $rule->execute($lead);
                    
                    Log::info("Automation executed successfully", [
                        'rule_id' => $rule->id,
                        'rule_name' => $rule->name,
                        'lead_id' => $lead->id,
                    ]);
                } catch (\Exception $e) {
                    Log::error("Automation failed", [
                        'rule_id' => $rule->id,
                        'rule_name' => $rule->name,
                        'lead_id' => $lead->id,
                        'error' => $e->getMessage(),
                    ]);
                }
            }
        }
    }

    /**
     * Handle opportunity won event.
     */
    public function handleOpportunityWon(Opportunity $opportunity): void
    {
        $rules = AutomationRule::active()
            ->byTrigger('opportunity_won')
            ->get();

        foreach ($rules as $rule) {
            try {
                $rule->execute($opportunity);
                
                Log::info("Automation executed successfully", [
                    'rule_id' => $rule->id,
                    'rule_name' => $rule->name,
                    'opportunity_id' => $opportunity->id,
                ]);
            } catch (\Exception $e) {
                Log::error("Automation failed", [
                    'rule_id' => $rule->id,
                    'rule_name' => $rule->name,
                    'opportunity_id' => $opportunity->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }

    /**
     * Create a default "Lead Won → Project" automation rule.
     */
    public function createDefaultLeadWonRule(int $userId, int $templateId): AutomationRule
    {
        return AutomationRule::create([
            'created_by' => $userId,
            'name' => 'Create Project on Lead Win',
            'description' => 'Automatically create a project when a lead is marked as won',
            'trigger_type' => 'lead_status_changed',
            'trigger_conditions' => [
                'status' => 'won',
            ],
            'action_type' => 'create_project',
            'action_config' => [
                'template_id' => $templateId,
                'name_template' => '{lead.title} - Implementation',
                'description_template' => 'Implementation project for {lead.title}',
            ],
            'is_active' => true,
        ]);
    }
}

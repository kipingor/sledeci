<?php

namespace App\Services\Lead;

use App\Models\Lead;
use App\Enums\LeadStatus;
use App\Events\LeadStatusChanged;
use App\Exceptions\InvalidStatusTransitionException;
use Illuminate\Support\Facades\DB;

class LeadStatusService
{
    public function transition(Lead $lead, LeadStatus $newStatus): Lead
    {
        $currentStatus = $lead->status;

        if (!$currentStatus->canTransitionTo($newStatus)) {
            throw new InvalidStatusTransitionException(
                "Cannot transition from {$currentStatus->value} to {$newStatus->value}"
            );
        }

        return DB::transaction(function () use ($lead, $newStatus, $currentStatus) {
            // Update status
            $updateData = ['status' => $newStatus];

            // Update timestamp field if applicable
            $timestampField = $newStatus->timestampField();
            if ($timestampField) {
                $updateData[$timestampField] = now();
            }

            $lead->update($updateData);

            // Dispatch event
            event(new LeadStatusChanged($lead, $currentStatus, $newStatus));

            return $lead->refresh();
        });
    }

    public function markAsContacted(Lead $lead): Lead
    {
        return $this->transition($lead, LeadStatus::CONTACTED);
    }

    public function qualify(Lead $lead): Lead
    {
        return $this->transition($lead, LeadStatus::QUALIFIED);
    }

    public function markProposalSent(Lead $lead): Lead
    {
        return $this->transition($lead, LeadStatus::PROPOSAL_SENT);
    }

    public function moveToNegotiation(Lead $lead): Lead
    {
        return $this->transition($lead, LeadStatus::NEGOTIATION);
    }

    public function markAsWon(Lead $lead): Lead
    {
        return $this->transition($lead, LeadStatus::WON);
    }

    public function markAsLost(Lead $lead, ?string $reason = null): Lead
    {
        $lead = $this->transition($lead, LeadStatus::LOST);

        if ($reason) {
            $metadata = $lead->metadata ?? [];
            $metadata['lost_reason'] = $reason;
            $metadata['lost_at'] = now()->toISOString();
            $lead->update(['metadata' => $metadata]);
        }

        return $lead->refresh();

    }

    public function archive(Lead $lead): Lead
    {
        return $this->transition($lead, LeadStatus::ARCHIVED);
    }

    public function getAvailableTransitions(Lead $lead): array
    {
        $currentStatus = $lead->status;
        $availableStatuses = [];

        foreach (LeadStatus::cases() as $status) {
            if ($currentStatus->canTransitionTo($status)) {
                $availableStatuses[] = [
                    'value' => $status->value,
                    'label' => $status->label(),
                    'color' => $status->color()
                ];
            }
        }

        return $availableStatuses;
    }

    public function canTransition(Lead $lead, LeadStatus $newStatus): bool
    {
        return $lead->status->canTransitionTo($newStatus);
    }

    public function getStatusHistory(Lead $lead): array
    {
        $history = [];
        foreach (LeadStatus::cases() as $status) {
            $field = $status->timestampField();
            if ($field && $lead->$field) {
                $history[] = [
                    'status' => $status->value,
                    'label' => $status->label(),
                    'timestamp' => $lead->$field,
                ];
            }
        }

        usort($history, fn($a, $b) => strtotime($a['timestamp']) <=> strtotime($b['timestamp']));

        return $history;
    }
}
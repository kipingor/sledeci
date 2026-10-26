<?php

namespace App\Exceptions;

use App\Enums\LeadStatus;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class InvalidStatusTransitionException extends Exception
{
    /**
     * The current status.
     */
    protected LeadStatus $currentStatus;

    /**
     * The attempted new status.
     */
    protected LeadStatus $attemptedStatus;

    /**
     * Create a new exception instance.
     */
    public function __construct(
        string $message = '',
        ?LeadStatus $currentStatus = null,
        ?LeadStatus $attemptedStatus = null
    ) {
        parent::__construct(
            $message ?: 'Invalid status transition attempted.'
        );

        if ($currentStatus) {
            $this->currentStatus = $currentStatus;
        }

        if ($attemptedStatus) {
            $this->attemptedStatus = $attemptedStatus;
        }
    }

    /**
     * Report the exception.
     */
    public function report(): void
    {
        // Log the invalid transition attempt
        Log::warning('Invalid lead status transition attempted', [
            'current_status' => $this->currentStatus->value ?? 'unknown',
            'attempted_status' => $this->attemptedStatus->value ?? 'unknown',
            'message' => $this->message,
        ]);
    }

    /**
     * Render the exception as an HTTP response.
     */
    public function render(Request $request): JsonResponse
    {
        $statusCode = 422; // Unprocessable Entity

        $response = [
            'message' => $this->message,
            'error' => 'invalid_status_transition',
        ];

        // Add detailed information if statuses are set
        if (isset($this->currentStatus) && isset($this->attemptedStatus)) {
            $response['details'] = [
                'current_status' => [
                    'value' => $this->currentStatus->value,
                    'label' => $this->currentStatus->label(),
                ],
                'attempted_status' => [
                    'value' => $this->attemptedStatus->value,
                    'label' => $this->attemptedStatus->label(),
                ],
                'allowed_transitions' => array_map(
                    fn($status) => [
                        'value' => $status->value,
                        'label' => $status->label(),
                    ],
                    $this->getAllowedTransitions()
                ),
            ];
        }

        return response()->json($response, $statusCode);
    }

    /**
     * Get allowed transitions from current status.
     */
    protected function getAllowedTransitions(): array
    {
        if (!isset($this->currentStatus)) {
            return [];
        }

        $allowed = [];
        foreach (LeadStatus::cases() as $status) {
            if ($this->currentStatus->canTransitionTo($status)) {
                $allowed[] = $status;
            }
        }

        return $allowed;
    }

    /**
     * Get the current status.
     */
    public function getCurrentStatus(): ?LeadStatus
    {
        return $this->currentStatus ?? null;
    }

    /**
     * Get the attempted status.
     */
    public function getAttemptedStatus(): ?LeadStatus
    {
        return $this->attemptedStatus ?? null;
    }

    /**
     * Create exception with status information.
     */
    public static function fromStatuses(
        LeadStatus $currentStatus,
        LeadStatus $attemptedStatus
    ): self {
        return new self(
            sprintf(
                'Cannot transition from %s to %s',
                $currentStatus->label(),
                $attemptedStatus->label()
            ),
            $currentStatus,
            $attemptedStatus
        );
    }
}
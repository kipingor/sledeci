<?php

namespace App\Policies;

use App\Models\PipelineStage;
use App\Models\User;

class PipelineStagePolicy
{
    /**
     * Determine whether the user can view any pipeline stages.
     */
    public function viewAny(User $user): bool
    {
        // All authenticated users can view pipeline stages
        return true;
    }

    /**
     * Determine whether the user can view the pipeline stage.
     */
    public function view(User $user, PipelineStage $pipelineStage): bool
    {
        // All authenticated users can view individual pipeline stages
        return true;
    }

    /**
     * Determine whether the user can create pipeline stages.
     */
    public function create(User $user): bool
    {
        // Only admins or managers can create pipeline stages
        return $user->hasRole(['admin', 'manager']);
    }

    /**
     * Determine whether the user can update the pipeline stage.
     */
    public function update(User $user, PipelineStage $pipelineStage): bool
    {
        // Only admins or managers can update pipeline stages
        return $user->hasRole(['admin', 'manager']);
    }

    /**
     * Determine whether the user can delete the pipeline stage.
     */
    public function delete(User $user, PipelineStage $pipelineStage): bool
    {
        // Only admins can delete pipeline stages
        // Also check if stage has any leads
        if (!$user->hasRole('admin')) {
            return false;
        }

        // Prevent deletion if stage has leads
        return $pipelineStage->leads()->count() === 0;
    }

    /**
     * Determine whether the user can restore the pipeline stage.
     */
    public function restore(User $user, PipelineStage $pipelineStage): bool
    {
        // Only admins can restore pipeline stages
        return $user->hasRole('admin');
    }

    /**
     * Determine whether the user can permanently delete the pipeline stage.
     */
    public function forceDelete(User $user, PipelineStage $pipelineStage): bool
    {
        // Only admins can force delete pipeline stages
        // And only if the stage has no leads
        return $user->hasRole('admin')
            && $pipelineStage->leads()->count() === 0;
    }

    /**
     * Determine whether the user can reorder pipeline stages.
     */
    public function reorder(User $user): bool
    {
        // Only admins or managers can reorder pipeline stages
        return $user->hasRole(['admin', 'manager']);
    }

    /**
     * Determine whether the user can move leads between stages.
     */
    public function moveLead(User $user, PipelineStage $fromStage, PipelineStage $toStage): bool
    {
        // Users can move leads between stages if they can update the lead
        return true;
    }
}

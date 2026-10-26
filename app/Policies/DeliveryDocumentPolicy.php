<?php

namespace App\Policies;

use App\Models\DeliveryDocument;
use App\Models\User;
use Sledeci\Core\Policies\ChecksModuleRoles;

/**
 * Access follows the "delivery-documents" module in config/access.php.
 */
class DeliveryDocumentPolicy
{
    use ChecksModuleRoles;

    protected function modules(): array
    {
        return ['delivery-documents'];
    }

    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $this->canRead($user);
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, DeliveryDocument $deliveryDocument): bool
    {
        return $this->canRead($user);
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $this->canWrite($user);
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, DeliveryDocument $deliveryDocument): bool
    {
        return $this->canWrite($user);
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, DeliveryDocument $deliveryDocument): bool
    {
        return $this->canWrite($user);
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, DeliveryDocument $deliveryDocument): bool
    {
        return $this->canWrite($user);
    }

    /**
     * Permanent deletion is never allowed through the application.
     */
    public function forceDelete(User $user, DeliveryDocument $deliveryDocument): bool
    {
        return false;
    }
}

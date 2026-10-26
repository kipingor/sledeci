<?php

namespace App\Policies;

use App\Models\Product;
use App\Models\User;
use Sledeci\Core\Policies\ChecksModuleRoles;

/**
 * Access follows the "products" module in config/access.php.
 */
class ProductPolicy
{
    use ChecksModuleRoles;

    protected function modules(): array
    {
        return ['products'];
    }

    public function viewAny(User $user): bool
    {
        return $this->canRead($user);
    }

    public function view(User $user, Product $product): bool
    {
        return $this->canRead($user);
    }

    public function create(User $user): bool
    {
        return $this->canWrite($user);
    }

    public function update(User $user, Product $product): bool
    {
        return $this->canWrite($user);
    }

    public function delete(User $user, Product $product): bool
    {
        return $this->canWrite($user);
    }

    public function restore(User $user, Product $product): bool
    {
        return $this->canWrite($user);
    }

    public function forceDelete(User $user, Product $product): bool
    {
        return false;
    }
}

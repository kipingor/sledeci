<?php

namespace Sledeci\Core\Fallbacks;

use Illuminate\Support\Collection;
use Sledeci\Core\Contracts\PendingFollowUps;

/**
 * Used when the clients package is not installed.
 */
class NullPendingFollowUps implements PendingFollowUps
{
    public function pending(int $limit = 5): Collection
    {
        return collect();
    }
}

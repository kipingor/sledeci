<?php

namespace Sledeci\Core\Contracts;

use Illuminate\Support\Collection;

/**
 * Upcoming client follow-ups, for dashboards that live in other packages
 * (the accounting overview shows them). Implemented by the clients package;
 * core binds an empty fallback so the dashboard still renders without it.
 */
interface PendingFollowUps
{
    /**
     * Open follow-ups, soonest first, each with `client` (id, name, email) and
     * `project` (id, name) loaded.
     *
     * @return Collection<int, object>
     */
    public function pending(int $limit = 5): Collection;
}

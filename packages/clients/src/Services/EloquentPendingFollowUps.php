<?php

namespace Sledeci\Clients\Services;

use Illuminate\Support\Collection;
use Sledeci\Clients\Models\ClientFollowUp;
use Sledeci\Core\Contracts\PendingFollowUps;

class EloquentPendingFollowUps implements PendingFollowUps
{
    public function pending(int $limit = 5): Collection
    {
        return ClientFollowUp::with('client:id,name,email', 'project:id,name')
            ->whereNull('completed_at')
            ->orderBy('scheduled_at')
            ->limit($limit)
            ->get();
    }
}

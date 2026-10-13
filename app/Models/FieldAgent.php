<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FieldAgent extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'user_id', 'agent_code', 'territory',
        'phone', 'commission_rate', 'active', 'metadata',
    ];

    protected $casts = [
        'commission_rate' => 'decimal:2',
        'active'          => 'boolean',
        'metadata'        => 'array',
    ];

    public function user(): BelongsTo   { return $this->belongsTo(User::class); }
    public function visits(): HasMany   { return $this->hasMany(AgentVisit::class); }

    public function todayVisits(): int
    {
        return $this->visits()->whereDate('checked_in_at', today())->count();
    }

    public function monthRevenue(): float
    {
        return (float) $this->visits()
            ->whereMonth('checked_in_at', now()->month)
            ->whereYear('checked_in_at', now()->year)
            ->sum('order_total');
    }
}

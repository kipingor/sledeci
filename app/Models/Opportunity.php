<?php

namespace App\Models;

use App\Enums\OpportunityStage;
use App\Policies\OpportunityPolicy;
use Illuminate\Database\Eloquent\Attributes\UsePolicy;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

#[UsePolicy(OpportunityPolicy::class)]
class Opportunity extends Model
{
    use HasFactory, SoftDeletes;

    public const STAGES = [
        'qualification',
        'proposal',
        'negotiation',
        'closed_won',
        'closed_lost',
    ];

    protected $fillable = [
        'lead_id',
        'assigned_to',
        'owner_id',
        'title',
        'summary',
        'description',
        'estimated_value',
        'currency',
        'probability',
        'stage',
        'expected_close_date',
        'contact_name',
        'contact_email',
        'contact_phone',
        'ai_suggestions',
    ];

    protected $casts = [
        'ai_suggestions' => 'array',
        'estimated_value' => 'decimal:2',
        'probability' => 'integer',
        'expected_close_date' => 'datetime:Y-m-d',
        'stage' => OpportunityStage::class,
    ];

    /**
     * BUG FIX: Kanban board was calling ->sum('weighted_value') and ->sum('amount')
     * which returned 0 because neither column exists in the DB.
     *
     * weighted_value = estimated_value × (probability / 100)
     * Appended so it serialises in toArray() / JSON responses.
     */
    protected $appends = ['weighted_value', 'closed_at'];

    public function getWeightedValueAttribute(): float
    {
        return round(
            (float) ($this->estimated_value ?? 0) * ($this->probability ?? 0) / 100,
            2
        );
    }

    /**
     * BUG FIX: TypeScript Opportunity interface expects a `closed_at` field
     * and the card uses it to determine if an opportunity is overdue.
     * The DB has no closed_at column; derive it from updated_at when stage is closed.
     */
    public function getClosedAtAttribute(): ?string
    {
        if ($this->stage?->isClosed()) {
            return $this->updated_at?->toISOString();
        }

        return null;
    }

    /**
     * `amount` is an alias for `estimated_value` used in some frontend code.
     * BUG FIX: kanban was summing 'amount' column which doesn't exist.
     */
    public function getAmountAttribute(): float
    {
        return (float) ($this->estimated_value ?? 0);
    }

    // ── Scopes ────────────────────────────────────────────────────────────────

    /**
     * BUG FIX: OpportunityController::kanban() called ->search() scope
     * which didn't exist — threw "Call to undefined method" error.
     */
    public function scopeSearch(Builder $query, string $term): Builder
    {
        return $query->where(function ($q) use ($term) {
            $q->where('title', 'like', "%{$term}%")
                ->orWhere('contact_name', 'like', "%{$term}%")
                ->orWhere('description', 'like', "%{$term}%");
        });
    }

    /**
     * BUG FIX: OpportunityController::kanban() called ->byStage() scope
     * which didn't exist.
     */
    public function scopeByStage(Builder $query, OpportunityStage $stage): Builder
    {
        return $query->where('stage', $stage->value);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->whereNotIn('stage', ['closed_won', 'closed_lost']);
    }

    // ── Relations ─────────────────────────────────────────────────────────────

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function project(): HasOne
    {
        return $this->hasOne(Project::class);
    }

    public function proposals(): HasMany
    {
        return $this->hasMany(Proposal::class);
    }

    public function emails(): HasMany
    {
        return $this->hasMany(Email::class);
    }
}

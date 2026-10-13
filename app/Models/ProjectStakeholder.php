<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Stakeholder Register entry — PMBOK §13.1.3
 *
 * Engagement levels per §13.2.2 Stakeholder Engagement Assessment Matrix:
 *  Unaware → Resistant → Neutral → Supportive → Leading
 *
 * Power/Interest grid per §13.1.2 for prioritisation strategy.
 */
class ProjectStakeholder extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'project_stakeholders';

    public const ENGAGEMENT_LEVELS = [
        'unaware', 'resistant', 'neutral', 'supportive', 'leading',
    ];

    public const INFLUENCE_LEVELS = ['low', 'medium', 'high'];
    public const INTEREST_LEVELS  = ['low', 'medium', 'high'];

    /**
     * Quadrant labels from the Power/Interest grid (PMBOK §13.1.2).
     * Used to determine the management strategy.
     */
    public const QUADRANT_STRATEGIES = [
        'high_influence_high_interest' => 'Manage Closely',
        'high_influence_low_interest'  => 'Keep Satisfied',
        'low_influence_high_interest'  => 'Keep Informed',
        'low_influence_low_interest'   => 'Monitor',
    ];

    protected $fillable = [
        'project_id', 'user_id',
        'name', 'email', 'organization', 'role',
        'influence', 'interest',
        'current_engagement', 'desired_engagement',
        'preferred_communication', 'communication_frequency',
        'expectations', 'concerns', 'engagement_strategy', 'notes',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    // ── Relations ─────────────────────────────────────────────────────────────

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /** Linked system user, if any. */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Return which quadrant of the Power/Interest grid this stakeholder sits in.
     * Drives the management strategy recommendation.
     */
    public function getGridQuadrantAttribute(): string
    {
        $hi = $this->influence === 'high';
        $hi_interest = $this->interest === 'high';

        return match (true) {
            $hi && $hi_interest   => 'high_influence_high_interest',
            $hi && !$hi_interest  => 'high_influence_low_interest',
            !$hi && $hi_interest  => 'low_influence_high_interest',
            default               => 'low_influence_low_interest',
        };
    }

    public function getManagementStrategyAttribute(): string
    {
        return self::QUADRANT_STRATEGIES[$this->grid_quadrant];
    }

    /**
     * Whether there is a gap between current and desired engagement.
     * A gap means the stakeholder needs active management.
     */
    public function getHasEngagementGapAttribute(): bool
    {
        $levels = self::ENGAGEMENT_LEVELS;
        $current = array_search($this->current_engagement, $levels);
        $desired = array_search($this->desired_engagement, $levels);
        return $current !== $desired;
    }

    /** Display name — prefer linked user's name. */
    public function getDisplayNameAttribute(): string
    {
        return $this->user?->name ?? $this->name;
    }
}

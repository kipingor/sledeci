<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Stakeholder Register entry — PMBOK §13.
 *
 * @property int         $id
 * @property int         $project_id
 * @property int|null    $user_id
 * @property string      $name
 * @property string      $influence           low|medium|high  (power axis)
 * @property string      $interest            low|medium|high
 * @property string      $current_engagement  unaware|resistant|neutral|supportive|leading
 * @property string      $desired_engagement  unaware|resistant|neutral|supportive|leading
 * @property bool        $is_active
 */
class ProjectStakeholder extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'project_stakeholders';

    public const INFLUENCE_LEVELS = ['low', 'medium', 'high'];

    public const INTEREST_LEVELS = ['low', 'medium', 'high'];

    /** Ordered from least to most engaged (PMBOK Stakeholder Engagement Assessment Matrix). */
    public const ENGAGEMENT_LEVELS = ['unaware', 'resistant', 'neutral', 'supportive', 'leading'];

    protected $fillable = [
        'project_id',
        'user_id',
        'name',
        'email',
        'organization',
        'role',
        'influence',
        'interest',
        'current_engagement',
        'desired_engagement',
        'preferred_communication',
        'communication_frequency',
        'expectations',
        'concerns',
        'engagement_strategy',
        'notes',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    /** Exposed to the Inertia pages (resources/js/pages/projects/show.tsx). */
    protected $appends = ['display_name', 'management_strategy', 'has_engagement_gap'];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function getDisplayNameAttribute(): string
    {
        return $this->user?->name ?? $this->name;
    }

    /** The UI calls this "management strategy"; it is stored as engagement_strategy. */
    public function getManagementStrategyAttribute(): ?string
    {
        return $this->engagement_strategy;
    }

    public function getHasEngagementGapAttribute(): bool
    {
        $levels = self::ENGAGEMENT_LEVELS;

        return array_search($this->current_engagement, $levels, true)
            < array_search($this->desired_engagement, $levels, true);
    }
}

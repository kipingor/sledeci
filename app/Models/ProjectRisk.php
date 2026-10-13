<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Risk Register entry — PMBOK §11.2.3
 *
 * @property int    $id
 * @property int    $project_id
 * @property int    $probability  1=Very Low, 2=Low, 3=Medium, 4=High, 5=Very High
 * @property int    $impact       1=Very Low, 2=Low, 3=Medium, 4=High, 5=Very High
 * @property float  $risk_score   probability × impact (computed column, 1–25)
 * @property string $status       identified|active|realized|closed
 */
class ProjectRisk extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'project_risks';

    // ── PMBOK probability/impact rating labels ────────────────────────────────
    public const RATING_LABELS = [
        1 => 'Very Low',
        2 => 'Low',
        3 => 'Medium',
        4 => 'High',
        5 => 'Very High',
    ];

    // ── Risk score bands (P×I matrix) ────────────────────────────────────────
    // PMBOK §11.3.2 — Probability and Impact Matrix
    public const SCORE_BANDS = [
        'low'    => [1, 5],   // score 1–5
        'medium' => [6, 14],  // score 6–14
        'high'   => [15, 25], // score 15–25
    ];

    public const CATEGORIES = [
        'technical', 'external', 'organizational', 'project_management',
        'schedule', 'cost', 'scope', 'quality', 'resource', 'other',
    ];

    public const RESPONSE_TYPES = [
        'avoid', 'transfer', 'mitigate', 'accept', 'escalate',
    ];

    public const STATUSES = [
        'identified', 'active', 'realized', 'closed',
    ];

    protected $fillable = [
        'project_id', 'owner_id', 'created_by',
        'title', 'description', 'category',
        'probability', 'impact',
        'response_type', 'response_plan', 'contingency_plan', 'trigger',
        'residual_probability', 'residual_impact',
        'status', 'identified_date', 'review_date', 'notes',
    ];

    protected $casts = [
        'risk_score'          => 'float',
        'probability'         => 'integer',
        'impact'              => 'integer',
        'residual_probability'=> 'integer',
        'residual_impact'     => 'integer',
        'identified_date'     => 'date',
        'review_date'         => 'date',
    ];

    // ── Relations ─────────────────────────────────────────────────────────────

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Classify the risk level based on the P×I score.
     * Maps to PMBOK §11.3.2 probability and impact matrix bands.
     */
    public function getRiskLevelAttribute(): string
    {
        $score = $this->probability * $this->impact;
        if ($score >= 15) return 'high';
        if ($score >= 6)  return 'medium';
        return 'low';
    }

    /**
     * Residual risk score after response actions are in place.
     */
    public function getResidualScoreAttribute(): ?float
    {
        if ($this->residual_probability && $this->residual_impact) {
            return $this->residual_probability * $this->residual_impact;
        }
        return null;
    }
}

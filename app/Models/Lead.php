<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\Builder;
use App\Enums\LeadStatus;
use App\Enums\LeadType;
use App\Jobs\ExecuteWorkflowJob;
use App\Policies\LeadPolicy;
use Illuminate\Database\Eloquent\Attributes\UsePolicy;

#[UsePolicy(LeadPolicy::class)]
class Lead extends Model
{
    use HasFactory, SoftDeletes;

    /** Supported currencies — used by the frontend select */
    public const CURRENCIES = [
        'KES' => 'KES — Kenyan Shilling',
        'USD' => 'USD — US Dollar',
        'EUR' => 'EUR — Euro',
        'GBP' => 'GBP — British Pound',
        'UGX' => 'UGX — Ugandan Shilling',
        'TZS' => 'TZS — Tanzanian Shilling',
        'ZAR' => 'ZAR — South African Rand',
        'NGN' => 'NGN — Nigerian Naira',
        'AED' => 'AED — UAE Dirham',
        'CNY' => 'CNY — Chinese Yuan',
    ];

    protected $fillable = [
        'title',
        'description',
        'type',
        'status',
        'created_by',
        'owner_id',
        'pipeline_stage_id',
        'order',
        'metadata',
        'ai_reviewed',
        'is_starred',
        'contacted_at',
        'qualified_at',
        'proposal_sent_at',
        'negotiation_started_at',
        'converted_to_opportunity_at',
        'won_at',
        'lost_at',
        'archived_at',
        'estimated_value',
        'currency',          // ← NEW: 3-char ISO 4217 code, defaults to KES
    ];

    protected $casts = [
        'type'                        => LeadType::class,
        'status'                      => LeadStatus::class,
        'ai_reviewed'                 => 'boolean',
        'is_starred'                  => 'boolean',
        'metadata'                    => 'array',
        'contacted_at'                => 'datetime',
        'qualified_at'                => 'datetime',
        'proposal_sent_at'            => 'datetime',
        'negotiation_started_at'      => 'datetime',
        'converted_to_opportunity_at' => 'datetime',
        'won_at'                      => 'datetime',
        'lost_at'                     => 'datetime',
        'archived_at'                 => 'datetime',
        'estimated_value'             => 'decimal:2',
    ];

    protected $appends = ['status_label', 'status_color'];

    // ── Accessors ─────────────────────────────────────────────────────────────

    public function getStatusLabelAttribute(): string
    {
        return $this->status?->label() ?? ucfirst($this->getRawOriginal('status') ?? '');
    }

    public function getStatusColorAttribute(): string
    {
        return $this->status?->color() ?? 'gray';
    }

    // ── Relations ─────────────────────────────────────────────────────────────

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function pipelineStage(): BelongsTo
    {
        return $this->belongsTo(PipelineStage::class, 'pipeline_stage_id');
    }

    public function questions(): HasMany
    {
        return $this->hasMany(LeadQuestion::class);
    }

    public function leadDocuments(): HasMany
    {
        return $this->hasMany(LeadDocument::class);
    }

    public function opportunity(): HasOne
    {
        return $this->hasOne(Opportunity::class);
    }

    public function proposals(): HasMany
    {
        return $this->hasMany(Proposal::class);
    }

    public function emails(): HasMany
    {
        return $this->hasMany(Email::class);
    }

    public function activities(): HasMany
    {
        return $this->hasMany(Activity::class);
    }

    public function conversations(): HasMany
    {
        return $this->hasMany(Conversation::class);
    }

    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class, 'lead_tag');
    }

    public function comments(): MorphMany
    {
        return $this->morphMany(Comment::class, 'commentable');
    }

    // ── Scopes ────────────────────────────────────────────────────────────────

    public function scopeStatus(Builder $query, LeadStatus $status): Builder
    {
        return $query->where('status', $status);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->whereIn('status', LeadStatus::active());
    }

    public function scopeArchived(Builder $query): Builder
    {
        return $query->where('status', LeadStatus::ARCHIVED);
    }

    public function scopeWon(Builder $query): Builder
    {
        return $query->where('status', LeadStatus::WON);
    }

    public function scopeStarred(Builder $query): Builder
    {
        return $query->where('is_starred', true);
    }

    public function scopeSearch(Builder $query, string $term): Builder
    {
        return $query->where(function ($q) use ($term) {
            $q->where('title', 'like', "%{$term}%")
              ->orWhere('description', 'like', "%{$term}%");
        });
    }

    // ── Booted ────────────────────────────────────────────────────────────────

    protected static function booted(): void
    {
        static::created(function ($lead) {
            Workflow::where('trigger_type', 'lead_created')
                ->where('enabled', true)
                ->each(function ($workflow) use ($lead) {
                    ExecuteWorkflowJob::dispatch($workflow, $lead);
                });
        });

        static::updated(function ($lead) {
            if ($lead->isDirty('status')) {
                Workflow::where('trigger_type', 'status_change')
                    ->where('enabled', true)
                    ->each(function ($workflow) use ($lead) {
                        ExecuteWorkflowJob::dispatch($workflow, $lead);
                    });
            }
        });
    }

    /**
     * Whether this lead may move to the given status (delegates to the status enum).
     */
    public function canTransitionTo(\App\Enums\LeadStatus $status): bool
    {
        return $this->status->canTransitionTo($status);
    }

    /**
     * Whether this lead is in a terminal status (won / lost / ...).
     */
    public function isTerminal(): bool
    {
        return $this->status->isTerminal();
    }
}

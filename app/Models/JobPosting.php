<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class JobPosting extends Model
{
    use HasFactory, SoftDeletes;

    public const STATUS_DRAFT = 'draft';

    public const STATUS_PUBLISHED = 'published';

    public const STATUS_CLOSED = 'closed';

    public const EMPLOYMENT_TYPES = [
        'full_time' => 'Full-time',
        'part_time' => 'Part-time',
        'contract' => 'Contract',
        'internship' => 'Internship',
    ];

    public const EXPERIENCE_LEVELS = [
        'entry' => 'Entry level',
        'mid' => 'Mid level',
        'senior' => 'Senior',
        'lead' => 'Lead / Manager',
    ];

    protected $fillable = [
        'title', 'slug', 'department', 'location', 'is_remote', 'employment_type', 'experience_level',
        'summary', 'description', 'responsibilities', 'requirements', 'benefits',
        'salary_min', 'salary_max', 'salary_currency',
        'status', 'published_at', 'closes_at', 'created_by',
        'linkedin_post_urn', 'linkedin_posted_at',
    ];

    protected $casts = [
        'is_remote' => 'boolean',
        'salary_min' => 'decimal:2',
        'salary_max' => 'decimal:2',
        'published_at' => 'datetime',
        'closes_at' => 'date',
        'linkedin_posted_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $job) {
            if (blank($job->slug)) {
                $job->slug = static::uniqueSlug($job->title);
            }
        });
    }

    public static function uniqueSlug(string $title, ?int $ignoreId = null): string
    {
        $base = Str::slug($title) ?: 'role';
        $slug = $base;
        $i = 2;

        while (static::withTrashed()->where('slug', $slug)->when($ignoreId, fn ($q) => $q->whereKeyNot($ignoreId))->exists()) {
            $slug = "{$base}-{$i}";
            $i++;
        }

        return $slug;
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    /**
     * Roles candidates can currently apply for: published, and not past the closing date.
     */
    public function scopeOpen(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_PUBLISHED)
            ->where(fn (Builder $q) => $q->whereNull('closes_at')->orWhere('closes_at', '>=', now()->toDateString()));
    }

    public function isOpen(): bool
    {
        return $this->status === self::STATUS_PUBLISHED
            && ($this->closes_at === null || $this->closes_at->endOfDay()->isFuture());
    }

    public function employmentTypeLabel(): string
    {
        return self::EMPLOYMENT_TYPES[$this->employment_type] ?? Str::headline($this->employment_type);
    }

    public function applications(): HasMany
    {
        return $this->hasMany(JobApplication::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}

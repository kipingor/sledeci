<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Enums\ImportStatus;

class ImportJob extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'user_id',
        'type',
        'status',
        'file_path',
        'file_name',
        'total_rows',
        'processed_rows',
        'successful_rows',
        'failed_rows',
        'field_mapping',
        'options',
        'errors',
        'started_at',
        'completed_at',
    ];

    /**
     * The attributes that should be cast.
     */
    protected $casts = [
        'field_mapping' => 'array',
        'options' => 'array',
        'errors' => 'array',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
        'status' => ImportStatus::class,
    ];

    /**
     * Get the user who created the import job.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get progress percentage.
     */
    public function getProgressPercentageAttribute(): int
    {
        if ($this->total_rows === 0) {
            return 0;
        }

        return (int) round(($this->processed_rows / $this->total_rows) * 100);
    }

    /**
     * Get success rate percentage.
     */
    public function getSuccessRateAttribute(): int
    {
        if ($this->processed_rows === 0) {
            return 0;
        }

        return (int) round(($this->successful_rows / $this->processed_rows) * 100);
    }

    /**
     * Check if import is complete.
     */
    public function isComplete(): bool
    {
        return $this->status === ImportStatus::COMPLETED;
    }

    /**
     * Check if import failed.
     */
    public function isFailed(): bool
    {
        return $this->status === ImportStatus::FAILED;
    }

    /**
     * Check if import is processing.
     */
    public function isProcessing(): bool
    {
        return $this->status === ImportStatus::PROCESSING;
    }

    /**
     * Check if import is pending.
     */
    public function isPending(): bool
    {
        return $this->status === ImportStatus::PENDING;
    }

    /**
     * Mark import as started.
     */
    public function markAsStarted(): void
    {
        $this->update([
            'status' => ImportStatus::PROCESSING,
            'started_at' => now(),
        ]);
    }

    /**
     * Mark import as completed.
     */
    public function markAsCompleted(): void
    {
        $this->update([
            'status' => ImportStatus::COMPLETED,
            'completed_at' => now(),
        ]);
    }

    /**
     * Mark import as failed.
     */
    public function markAsFailed(string $error): void
    {
        $this->update([
            'status' => ImportStatus::FAILED,
            'completed_at' => now(),
            'errors' => array_merge($this->errors ?? [], [$error]),
        ]);
    }

    /**
     * Update progress.
     */
    public function updateProgress(int $processed, int $successful, int $failed, array $errors = []): void
    {
        $this->update([
            'processed_rows' => $processed,
            'successful_rows' => $successful,
            'failed_rows' => $failed,
            'errors' => $errors,
        ]);
    }

    /**
     * Scope to get recent imports.
     */
    public function scopeRecent($query, int $limit = 10)
    {
        return $query->latest()->limit($limit);
    }

    /**
     * Scope to get imports by status.
     */
    public function scopeByStatus($query, ImportStatus $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope to get imports by type.
     */
    public function scopeByType($query, string $type)
    {
        return $query->where('type', $type);
    }
}

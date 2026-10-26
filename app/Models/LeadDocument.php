<?php

namespace App\Models;

use App\Enums\LeadDocumentStatus;
use App\Policies\LeadDocumentPolicy;
use Illuminate\Database\Eloquent\Attributes\UsePolicy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[UsePolicy(LeadDocumentPolicy::class)]
class LeadDocument extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'lead_id',
        'filename',
        'original_name',
        'mime_type',
        'size',
        'storage_path',
        'status',
        'extracted_text',
        'ai_summary',
    ];

    /**
     * The attributes that should be cast.
     */
    protected $casts = [
        'status' => LeadDocumentStatus::class,
        // JSON column; ProcessLeadDocument stores ['text' => ...]. Without this cast saving an array fails.
        'extracted_text' => 'array',
        'metadata' => 'array',
        'ai_summary' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the lead that owns the document.
     */
    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function scopeStatus($query, LeadDocumentStatus $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Check if document is queued
     */
    public function scopeQueued($query)
    {
        return $query->whereIn('status', LeadDocumentStatus::QUEUED);
    }

    /**
     * Check if document is pending
     */
    public function scopePending($query)
    {
        return $query->whereIn('status', LeadDocumentStatus::PENDING);
    }

    /**
     * Check if document is processing
     */
    public function scopeProcessing($query)
    {
        return $query->whereIn('status', LeadDocumentStatus::PROCESSING);
    }

    /**
     * Check if document processing succeeded
     */
    public function isSucceeded($query)
    {
        return $query->whereIn('status', LeadDocumentStatus::SUCCEEDED);
    }

    /**
     * Check if document processing failed
     */
    public function scopeFailed($query)
    {
        return $query->whereIn('status', LeadDocumentStatus::FAILED);
    }

    /**
     * Mark as processing
     */
    public function markAsProcessing(): void
    {
        $this->update(['status' => LeadDocumentStatus::PROCESSING->value]);
    }

    /**
     * Mark as succeeded
     */
    public function markAsSucceeded(): void
    {
        $this->update([
            'status' => LeadDocumentStatus::SUCCEEDED->value,
            'processed' => true,
        ]);
    }

    /**
     * Mark as failed
     */
    public function markAsFailed(?string $error = null): void
    {
        $metadata = $this->metadata ?? [];

        if ($error) {
            $metadata['processing_error'] = $error;
            $metadata['processing_failed_at'] = now()->toISOString();
        }

        $this->update([
            'status' => LeadDocumentStatus::FAILED->value,
            'processed' => false,
            'metadata' => $metadata,
        ]);
    }
}

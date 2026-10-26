<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JobApplication extends Model
{
    use HasFactory;

    public const STATUSES = ['new', 'screening', 'interview', 'offer', 'hired', 'rejected'];

    protected $fillable = [
        'job_posting_id', 'name', 'email', 'phone', 'linkedin_url', 'portfolio_url', 'cover_letter',
        'resume_path', 'resume_original_name', 'status', 'rating', 'notes',
        'reviewed_by', 'reviewed_at', 'source', 'ip_address',
    ];

    protected $casts = [
        'rating' => 'integer',
        'reviewed_at' => 'datetime',
    ];

    public function jobPosting(): BelongsTo
    {
        return $this->belongsTo(JobPosting::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}

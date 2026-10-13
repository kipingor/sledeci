<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class HrLeaveRequest extends Model
{
    /** @use HasFactory<\Database\Factories\HrLeaveRequestFactory> */
    use HasFactory;

    public const STATUSES = [
        'pending',
        'approved',
        'rejected',
        'cancelled',
    ];

    protected $fillable = [
        'staff_profile_id',
        'from_date',
        'to_date',
        'type',
        'reason',
        'status',
        'approved_by',
        'admin_notes',
    ];

    protected $casts = [
        'from_date' => 'date',
        'to_date'   => 'date',
    ];

    // ── Relations ─────────────────────────────────────────────────────────────

    /**
     * The staff member who raised this request.
     * BUG FIX: relation was missing — HRController::leave() called
     * LeaveRequest::with('staffProfile') which threw an error.
     */
    public function staffProfile(): BelongsTo
    {
        return $this->belongsTo(StaffProfile::class);
    }

    /**
     * The user who approved/rejected this request.
     */
    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    // ── Scopes ────────────────────────────────────────────────────────────────

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'approved')
                     ->where('to_date', '>=', now());
    }
}

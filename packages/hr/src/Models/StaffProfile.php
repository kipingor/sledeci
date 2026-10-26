<?php

namespace Sledeci\Hr\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * HR staff / contractor profile (table: staff_profiles).
 * A login account links to it through users.staff_profile_id.
 */
class StaffProfile extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'staff_profiles';

    protected $fillable = [
        'employee_number', 'first_name', 'last_name', 'email', 'phone', 'role',
        'hourly_rate', 'monthly_salary', 'skills', 'avatar',
        'is_client', 'is_contractor', 'is_available',
        'company', 'address', 'notes', 'client_since',
    ];

    protected $casts = [
        'skills'         => 'array',
        'hourly_rate'    => 'decimal:2',
        'monthly_salary' => 'decimal:2',
        'is_client'      => 'boolean',
        'is_contractor'  => 'boolean',
        'is_available'   => 'boolean',
        'client_since'   => 'date',
    ];

    protected $appends = ['full_name'];

    public function user(): HasOne
    {
        return $this->hasOne(User::class, 'staff_profile_id');
    }

    public function leaveRequests(): HasMany
    {
        return $this->hasMany(HrLeaveRequest::class, 'staff_profile_id');
    }

    public function getFullNameAttribute(): string
    {
        return trim("{$this->first_name} {$this->last_name}");
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A user assigned to a project (table: project_users).
 */
class ProjectTeamMember extends Model
{
    use HasFactory;

    protected $table = 'project_users';

    protected $fillable = [
        'project_id', 'user_id', 'role',
        'allocation_percentage', 'hourly_rate', 'responsibilities', 'joined_at',
    ];

    protected $casts = [
        'allocation_percentage' => 'decimal:2',
        'hourly_rate' => 'decimal:2',
        'joined_at' => 'datetime',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

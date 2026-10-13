<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClientReport extends Model
{
    use SoftDeletes;

    protected $table = 'client_reports';

    protected $fillable = [
        'client_id', 'project_id', 'created_by',
        'title', 'period_type', 'period_start', 'period_end',
        'content', 'metrics', 'status', 'sent_at', 'viewed_at',
    ];

    protected $casts = [
        'metrics'      => 'array',
        'period_start' => 'date',
        'period_end'   => 'date',
        'sent_at'      => 'datetime',
        'viewed_at'    => 'datetime',
    ];

    public function client(): BelongsTo
    {
        return $this->belongsTo(User::class, 'client_id');
    }
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}

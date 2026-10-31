<?php

namespace Sledeci\Clients\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class ClientFollowUp extends Model
{
    use SoftDeletes;

    protected $table = 'client_follow_ups';

    protected $fillable = [
        'client_id', 'project_id', 'invoice_id', 'created_by',
        'type', 'subject', 'notes', 'outcome', 'priority',
        'scheduled_at', 'completed_at',
    ];

    protected $casts = [
        'scheduled_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function client(): BelongsTo
    {
        return $this->belongsTo(config('clients.user_model'), 'client_id');
    }
    public function project(): BelongsTo
    {
        return $this->belongsTo(config('clients.project_model'));
    }
    public function invoice(): BelongsTo
    {
        return $this->belongsTo(config('clients.invoice_model'));
    }
    public function creator(): BelongsTo
    {
        return $this->belongsTo(config('clients.user_model'), 'created_by');
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Email extends Model
{
    use HasFactory, SoftDeletes;

    public const STATUSES = [
        'draft',
        'queued',
        'sent',
        'delivered',
        'bounced',
        'opened',
        'clicked',
        'failed',
    ];

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'lead_id',
        'opportunity_id',
        'from',
        'from_name',
        'to',
        'recipient',
        'sender_id',
        'subject',
        'body',
        'body_plain',
        'direction',
        'status',
        'sent_at',
        'received_at',
        'opened_at',
        'metadata',
    ];

    protected $casts = [
        'metadata'    => 'array',
        'sent_at'     => 'datetime',
        'received_at' => 'datetime',
        'opened_at'   => 'datetime',
    ];

    /**
     * Get the lead associated with this email.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function lead()
    {
        return $this->belongsTo(Lead::class);
    }

    /**
     * Get the opportunity associated with this email.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function opportunity()
    {
        return $this->belongsTo(Opportunity::class);
    }

    /**
     * Get the user who sent this email.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function sender()
    {
        return $this->belongsTo(User::class, 'sender_id');
    }
}

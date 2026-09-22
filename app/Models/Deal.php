<?php

namespace App\Models;

use App\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class Deal extends Model
{
    use BelongsToTenant;
    use HasFactory;

    protected $fillable = [
        'tenant_id',
        'title',
        'value',
        'currency',
        'stage',
        'expected_close_date',
        'closed_at',
        'notes',
        'contact_id',
        'company_id',
        'owner_id',
    ];

    protected $casts = [
        'value'               => 'decimal:2',
        'expected_close_date' => 'date',
        'closed_at'           => 'date',
    ];

    public const STAGES = ['new', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];

    /** @return BelongsTo<Contact, $this> */
    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    /** @return BelongsTo<Company, $this> */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    /** @return BelongsTo<User, $this> */
    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    /** @return MorphMany<Activity, $this> */
    public function activities(): MorphMany
    {
        return $this->morphMany(Activity::class, 'actable')->latest();
    }

    public function isWon(): bool
    {
        return $this->stage === 'won';
    }

    public function isLost(): bool
    {
        return $this->stage === 'lost';
    }

    public function isOpen(): bool
    {
        return ! $this->isWon() && ! $this->isLost();
    }
}


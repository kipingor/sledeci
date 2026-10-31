<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Laravel\Fortify\Contracts\PasskeyUser;
use Laravel\Fortify\PasskeyAuthenticatable;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Laravel\Sanctum\HasApiTokens;
use Sledeci\Accounting\Models\Invoice;
use Sledeci\Clients\Models\ClientFollowUp;
use Sledeci\Clients\Models\ClientReport;
use Sledeci\KenyaPayroll\Models\Employee;
use Spatie\Permission\Traits\HasRoles;

/**
 * @property int $id
 * @property string $name
 * @property string $email
 * @property Carbon|null $email_verified_at
 * @property string $password
 * @property string|null $two_factor_secret
 * @property string|null $two_factor_recovery_codes
 * @property Carbon|null $two_factor_confirmed_at
 * @property string|null $remember_token
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['name', 'email', 'password', 'avatar', 'is_client', 'client_since', 'company', 'phone', 'address', 'website', 'notes'])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token'])]
class User extends Authenticatable implements MustVerifyEmail, PasskeyUser
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, PasskeyAuthenticatable, TwoFactorAuthenticatable, HasRoles;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_client'         => 'boolean',
            'two_factor_confirmed_at' => 'datetime',
        ];
    }

    // ── Client Scopes (replaces Client model) ─────────────────────────────────

    /**
     * Scope to only client users.
     * Usage: User::clients()->get()
     */
    public function scopeClients(Builder $query): Builder
    {
        return $query->where('is_client', true);
    }

    /**
     * Scope to a single client.
     * Usage: User::client()->find($id)
     */
    public function scopeClient(Builder $query): Builder
    {
        return $query->where('is_client', true);
    }

    /**
     * Convert this user into a client.
     */
    public function convertToClient(): static
    {
        $this->update([
            'is_client'    => true,
            'client_since' => $this->client_since ?? now(),
        ]);
        return $this;
    }

    // ── Relations ─────────────────────────────────────────────────────────────

    /** Projects where this user is the client. */
    public function projects(): HasMany
    {
        return $this->hasMany(Project::class, 'client_id');
    }

    /** Invoices issued to this client. */
    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class, 'client_id');
    }

    /** Follow-up tasks for this client. */
    public function clientFollowUps(): HasMany
    {
        return $this->hasMany(ClientFollowUp::class, 'client_id');
    }

    /** Reports generated for this client. */
    public function clientReports(): HasMany
    {
        return $this->hasMany(ClientReport::class, 'client_id');
    }

    /** Leads associated with this client. */
    public function leads(): HasMany
    {
        return $this->hasMany(Lead::class, 'client_id');
    }

    public function fieldAgent(): HasOne
    {
        return $this->hasOne(FieldAgent::class);
    }

     public function saccoMember(): HasOne
    {
        return $this->hasOne(SaccoMember::class);
    }

     public function employee(): HasOne
    {
        return $this->hasOne(Employee::class);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    public function getIsClientAttribute(): bool
    {
        return (bool) $this->attributes['is_client'];
    }

    public function getDisplayRoleAttribute(): string
    {
        return $this->is_client ? 'Client' : ucfirst($this->role ?? 'user');
    }

    public function isAdmin(): bool
    {
        return $this->hasRole(['admin', 'super-admin', 'manager']);
    }
}

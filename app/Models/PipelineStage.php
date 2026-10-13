<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PipelineStage extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'pipeline_stages';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'key',
        'name',
        'color',
        'order',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'order' => 'integer',
    ];

    /**
     * Get all leads in this pipeline stage.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function leads()
    {
        return $this->hasMany(Lead::class, 'pipeline_stage_id');
    }

    /**
     * Scope a query to order stages by their order field.
     *
     * @param  \Illuminate\Database\Eloquent\Builder  $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeOrdered($query)
    {
        return $query->orderBy('order');
    }

    /**
     * Scope a query to find a stage by its key.
     *
     * @param  \Illuminate\Database\Eloquent\Builder  $query
     * @param  string  $key
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeByKey($query, string $key)
    {
        return $query->where('key', $key);
    }
}

<?php

namespace App\Models;

use Database\Factories\OfflineQueueFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OfflineQueue extends Model
{
    /** @use HasFactory<OfflineQueueFactory> */
    use HasFactory;
}

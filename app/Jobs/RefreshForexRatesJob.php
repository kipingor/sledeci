<?php

namespace App\Jobs;

use App\Services\Forex\ForexService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * RefreshForexRatesJob
 *
 * Refreshes all major currency rates relative to the functional currency.
 * Scheduled hourly via the console kernel.
 *
 * Add to App\Console\Kernel::schedule():
 *   $schedule->job(new RefreshForexRatesJob)->hourly();
 */
class RefreshForexRatesJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 2;
    public int $backoff = 300; // 5 min retry

    public function handle(ForexService $forex): void
    {
        $functional = config('company.functional_currency', 'KES');
        $rates      = $forex->refreshRates($functional);

        Log::info('Forex rates refreshed via scheduled job', [
            'base'  => $functional,
            'count' => count($rates),
        ]);
    }
}

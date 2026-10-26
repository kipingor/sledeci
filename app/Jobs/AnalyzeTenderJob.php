<?php

namespace App\Jobs;

use App\Models\Tender;
use App\Services\Tender\TenderAgentService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class AnalyzeTenderJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The number of times the job may be attempted.
     */
    public $tries = 2;

    /**
     * The number of seconds to wait before retrying the job.
     */
    public $backoff = 60;

    /**
     * The number of seconds the job can run before timing out.
     * Analysis makes several sequential AI calls, so allow plenty of headroom.
     */
    public $timeout = 600;

    public function __construct(
        public Tender $tender
    ) {}

    public function handle(TenderAgentService $agent): void
    {
        Log::info('AnalyzeTenderJob: starting', ['tender_id' => $this->tender->id]);

        // analyze() manages analysis_status (processing → completed|failed) itself.
        $agent->analyze($this->tender);
    }

    public function failed(\Throwable $exception): void
    {
        Log::error('AnalyzeTenderJob: failed permanently', [
            'tender_id' => $this->tender->id,
            'error'     => $exception->getMessage(),
        ]);

        $this->tender->update(['analysis_status' => 'failed']);
    }
}

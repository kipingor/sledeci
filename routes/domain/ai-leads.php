<?php

use App\Http\Controllers\AILeadController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| AI lead intelligence (JSON endpoints used by the lead insight components)
| Route names resolve to web.ai.* => module "ai" in config/access.php.
|--------------------------------------------------------------------------
*/

Route::prefix('ai')->name('ai.')->group(function () {
    Route::get('/pipeline-health', [AILeadController::class, 'getPipelineHealth'])->name('pipeline-health');
    Route::post('/leads/batch-score', [AILeadController::class, 'batchScore'])->name('batch-score');
    Route::get('/leads/{lead}/insights', [AILeadController::class, 'getLeadInsights'])->name('lead-insights');
    Route::get('/leads/{lead}/recommendations', [AILeadController::class, 'getRecommendations'])->name('lead-recommendations');
    Route::get('/leads/{lead}/similar', [AILeadController::class, 'findSimilar'])->name('similar-leads');
    Route::post('/leads/{lead}/refresh', [AILeadController::class, 'refreshInsights'])->name('refresh-insights');
});

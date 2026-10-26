<?php

use App\Http\Controllers\Web\ActivityController;
use App\Http\Controllers\Web\ContactController;
use App\Http\Controllers\Web\OpportunityController;
use App\Http\Controllers\Web\PipelineController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| CRM: pipelines, opportunities, contacts, activities
|--------------------------------------------------------------------------
*/

Route::resource('pipelines', PipelineController::class);
Route::resource('opportunities', OpportunityController::class);

Route::resource('contacts', ContactController::class)->only(['index', 'create', 'store', 'show', 'update', 'destroy']);
Route::post('contacts/{contact}/regenerate-email', [ContactController::class, 'regenerateEmail'])->name('contacts.regenerate-email');
Route::post('contacts/{contact}/mark-initial-sent', [ContactController::class, 'markInitialSent'])->name('contacts.mark-initial-sent');
Route::post('contacts/{contact}/convert-to-lead', [ContactController::class, 'convertToLead'])->name('contacts.convert-to-lead');
Route::post('contacts/{contact}/follow-ups/{followUp}/send', [ContactController::class, 'sendFollowUp'])->name('contacts.follow-ups.send');
Route::patch('contacts/{contact}/follow-ups/{followUp}', [ContactController::class, 'updateFollowUp'])->name('contacts.follow-ups.update');

Route::resource('activities', ActivityController::class);

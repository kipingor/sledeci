<?php

use App\Http\Controllers\Web\ConversationController;
use App\Http\Controllers\Web\EmailController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Communications: conversations and email
|--------------------------------------------------------------------------
*/

Route::resource('conversations', ConversationController::class);

// Static segment must be registered before the resource so "compose" is not captured by {email}.
Route::get('emails/compose', [EmailController::class, 'compose'])->name('emails.compose');
Route::resource('emails', EmailController::class)->only(['index', 'store', 'show', 'destroy']);

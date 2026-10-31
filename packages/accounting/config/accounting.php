<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Related models (host application)
    |--------------------------------------------------------------------------
    | These classes live in the host app (or another package). Override them
    | in your own config if you use different model names.
    */
    'user_model'    => env('SLEDECI_USER_MODEL', \App\Models\User::class),
    'project_model' => env('SLEDECI_PROJECT_MODEL', \App\Models\Project::class),
    'client_model'  => env('SLEDECI_CLIENT_MODEL', \App\Models\User::class), // often same as user
];

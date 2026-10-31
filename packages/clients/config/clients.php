<?php

return [
    'user_model'    => env('SLEDECI_USER_MODEL', \App\Models\User::class),
    'project_model' => env('SLEDECI_PROJECT_MODEL', \App\Models\Project::class),
    'invoice_model' => env('SLEDECI_INVOICE_MODEL', \Sledeci\Accounting\Models\Invoice::class),
];

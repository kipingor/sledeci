<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Module route group
    |--------------------------------------------------------------------------
    | Middleware and name prefix applied to every module package's routes/web.php.
    | The defaults match the group in the host application's routes/web.php, so a
    | route is named "web.clients.index" whether it lives in the host or a package.
    */
    'web_middleware' => ['web', 'auth', 'verified', 'module.access'],
    'route_name_prefix' => 'web.',
];

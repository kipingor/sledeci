<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Invoice model
    |--------------------------------------------------------------------------
    | Follow-ups can point at an invoice. The Clients package does not import the
    | invoice model. The accounting package sets this when installed; point it at your own
    | billing model otherwise.
    */
    'invoice_model' => 'Sledeci\Accounting\Models\Invoice',
];

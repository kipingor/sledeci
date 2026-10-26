<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Invoice model
    |--------------------------------------------------------------------------
    | Follow-ups can point at an invoice. Clients depends on the accounting package
    | (invoice relations, totals, reports), so this defaults to its Invoice model; the
    | accounting provider also sets it at boot. Override only to use a different billing model.
    */
    'invoice_model' => 'Sledeci\Accounting\Models\Invoice',
];

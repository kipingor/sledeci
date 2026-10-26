<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Functional Currency  (IAS 21)
    |--------------------------------------------------------------------------
    | The currency of the primary economic environment in which the entity
    | operates. All journal entry amounts are stored in this currency.
    |
    | Foreign currency transactions are translated to this currency at the
    | spot rate on the transaction date and the difference recorded as
    | FX gain/loss (accounts 6400 / 9200).
    |
    | Change this to 'USD', 'EUR', etc. if your base currency is different.
    */
    'functional_currency' => env('ACCOUNTING_FUNCTIONAL_CURRENCY', 'KES'),

    /*
    |--------------------------------------------------------------------------
    | Presentation Currency  (IAS 21.38)
    |--------------------------------------------------------------------------
    | The currency in which financial statements are presented.
    | Usually the same as functional_currency.
    */
    'presentation_currency' => env('ACCOUNTING_PRESENTATION_CURRENCY', 'KES'),

    /*
    |--------------------------------------------------------------------------
    | Fiscal Year
    |--------------------------------------------------------------------------
    | The month the fiscal year starts (1 = January, 7 = July, etc.)
    | Used by AccountingPeriod::createFiscalYear() and the Balance Sheet
    | service when computing year-to-date figures.
    */
    'fiscal_year_start_month' => env('ACCOUNTING_FY_START_MONTH', 1),

    /*
    |--------------------------------------------------------------------------
    | Auto-Post on Invoice Paid
    |--------------------------------------------------------------------------
    | When true, the PostingEngine automatically posts a payment journal
    | entry whenever an invoice is marked as paid via InvoiceController.
    | Set to false to require manual posting via the journal entry screen.
    */
    'auto_post_on_payment' => env('ACCOUNTING_AUTO_POST', true),

    /*
    |--------------------------------------------------------------------------
    | Default Accounts
    |--------------------------------------------------------------------------
    | Account codes used as fallbacks when no specific account is mapped.
    | These must exist in chart_of_accounts after seeding.
    */
    'defaults' => [
        'revenue_account'   => '6100',  // Service Revenue
        'expense_account'   => '8900',  // General & Administrative
        'ar_account'        => '1100',  // Accounts Receivable
        'ap_account'        => '3100',  // Accounts Payable
        'bank_account'      => '1020',  // Bank Account — Main
        'vat_output'        => '3400',  // VAT Payable (Output VAT)
        'vat_input'         => '1400',  // VAT Receivable (Input VAT)
        'fx_gain'           => '6400',  // Foreign Exchange Gain
        'fx_loss'           => '9200',  // Foreign Exchange Loss
        'retained_earnings' => '5200',  // Retained Earnings
    ],

    /*
    |--------------------------------------------------------------------------
    | Rounding Precision
    |--------------------------------------------------------------------------
    | Number of decimal places for functional currency amounts.
    | 2 = cents (USD, EUR), 0 = no decimals (JPY), 3 = fils (KWD).
    */
    'rounding_precision' => env('ACCOUNTING_ROUNDING', 2),
];

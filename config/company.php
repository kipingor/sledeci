<?php

/**
 * Company Identity & Tax Configuration
 *
 * All values are driven from .env — never hardcode them here.
 * This config is used by:
 *   - Invoice / proposal / PO PDF templates
 *   - Email signatures and footers
 *   - Accounting engine (functional currency, tax rates)
 *   - Document headers
 *
 * Kenya-specific defaults are provided where relevant.
 */
return [

    // ── Identity ──────────────────────────────────────────────────────────────

    'name' => env('COMPANY_NAME', config('app.name')),
    'tagline' => env('COMPANY_TAGLINE', ''),
    'website' => env('COMPANY_WEBSITE', ''),
    // ── Contact ───────────────────────────────────────────────────────────────

    'email' => env('COMPANY_EMAIL', ''),
    'phone' => env('COMPANY_PHONE', ''),
    'phone_alt' => env('COMPANY_PHONE_ALT', ''),

    // ── Address ───────────────────────────────────────────────────────────────

    'address' => env('COMPANY_ADDRESS', ''),       // Street / building
    'city' => env('COMPANY_CITY', 'Nairobi'),
    'county' => env('COMPANY_COUNTY', 'Nairobi County'),
    'country' => env('COMPANY_COUNTRY', 'Kenya'),
    'postal_code' => env('COMPANY_POSTAL_CODE', ''),
    'po_box' => env('COMPANY_PO_BOX', ''),

    // ── Tax & Registration ────────────────────────────────────────────────────
    //
    // KRA PIN   — Kenya Revenue Authority Personal Identification Number
    //             Format: Pxxxxxxxxx (individual) or Pxxxxxxxxx (company starts with A or P)
    //             Required on all tax invoices issued in Kenya (VAT Act Cap 476).
    //
    // VAT No    — VAT registration number (same as KRA PIN for most Kenyan companies,
    //             but display them separately as they appear on different documents).
    //
    // Business  — Certificate of Incorporation number from the Business Registration Service.
    //
    // NSSF / NHIF — Only relevant for payslips / HR documents.

    'kra_pin' => env('COMPANY_KRA_PIN', ''),        // e.g. P051234567A
    'vat_number' => env('COMPANY_VAT_NUMBER', ''),     // e.g. P051234567A (often same as KRA PIN)
    'business_reg' => env('COMPANY_BUSINESS_REG', ''),   // e.g. CPR/2019/123456
    'nssf_number' => env('COMPANY_NSSF_NUMBER', ''),
    'nhif_number' => env('COMPANY_NHIF_NUMBER', ''),

    // Is the company VAT registered? Controls whether VAT line appears on invoices.
    'vat_registered' => env('COMPANY_VAT_REGISTERED', false),

    // Default VAT rate (Kenya standard rate is 16%).
    // Can be overridden per-invoice via the tax_rate field.
    'default_vat_rate' => env('COMPANY_DEFAULT_VAT_RATE', 16),

    // Withholding tax rate (Kenya: typically 5% on professional services)
    'wht_rate' => env('COMPANY_WHT_RATE', 5),

    // ── Functional Currency ───────────────────────────────────────────────────

    'functional_currency' => env('COMPANY_FUNCTIONAL_CURRENCY', 'KES'),
    'currency_symbol' => env('COMPANY_CURRENCY_SYMBOL', 'KES'),

    // ── Banking ───────────────────────────────────────────────────────────────
    //
    // Displayed on invoice PDFs under "Payment Details".
    // You can define multiple accounts if needed; the first is the default.

    'bank_name' => env('COMPANY_BANK_NAME', ''),           // e.g. Equity Bank Kenya
    'bank_branch' => env('COMPANY_BANK_BRANCH', ''),         // e.g. Upper Hill Branch
    'bank_account_name' => env('COMPANY_BANK_ACCOUNT_NAME', ''),   // Registered account name
    'bank_account_no' => env('COMPANY_BANK_ACCOUNT_NO', ''),     // Account number
    'bank_swift' => env('COMPANY_BANK_SWIFT', ''),          // SWIFT/BIC code
    'bank_sort_code' => env('COMPANY_BANK_SORT_CODE', ''),      // Branch sort code

    // M-Pesa Paybill / Till (common in Kenya)
    'mpesa_paybill' => env('COMPANY_MPESA_PAYBILL', ''),       // Paybill number
    'mpesa_account' => env('COMPANY_MPESA_ACCOUNT', ''),       // Account reference for paybill
    'mpesa_till' => env('COMPANY_MPESA_TILL', ''),          // Buy Goods till number

    // ── Branding ─────────────────────────────────────────────────────────────

    // Absolute path to the logo used in PDF documents.
    // Place logo at public/images/logo.png and this will resolve correctly.
    'logo_path' => env('COMPANY_LOGO_PATH', public_path('images/logo.png')),

    // Primary brand colour (used in PDF headers). Amber Obsidian default.
    'brand_color' => env('COMPANY_BRAND_COLOR', '#F59E0B'),
    'brand_dark' => env('COMPANY_BRAND_DARK', '#111827'),

    // ── Invoice Settings ──────────────────────────────────────────────────────

    // Footer text shown at the bottom of every invoice PDF.
    'invoice_footer' => env(
        'COMPANY_INVOICE_FOOTER',
        'Thank you for your business. Payment is due within the terms stated above.'
    ),

    // Standard payment terms text (displayed on invoice).
    'payment_terms' => env('COMPANY_PAYMENT_TERMS', 'Net 30'),

    // ── Proposal / Quote Settings ─────────────────────────────────────────────

    'proposal_validity_days' => env('COMPANY_PROPOSAL_VALIDITY_DAYS', 30),
    'proposal_footer' => env(
        'COMPANY_PROPOSAL_FOOTER',
        'This proposal is valid for the period stated. Prices exclude VAT unless otherwise noted.'
    ),

];

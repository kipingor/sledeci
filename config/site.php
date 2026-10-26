<?php

/*
|--------------------------------------------------------------------------
| Public website settings
|--------------------------------------------------------------------------
| Used by the public pages (about, solutions, contact, terms, careers) and the
| careers / LinkedIn workflow. Everything has an environment override so the
| public site can be branded without code changes.
*/

return [
    'name' => env('SITE_NAME', env('APP_NAME', 'Sledeci')),
    'tagline' => env('SITE_TAGLINE', 'One platform to run sales, projects, finance, people and stock.'),

    // Legal entity shown in the Terms & Conditions. Replace before going live.
    'legal_name' => env('SITE_LEGAL_NAME', env('APP_NAME', 'Sledeci').' Limited'),
    'country' => env('SITE_COUNTRY', 'Kenya'),
    'governing_law' => env('SITE_GOVERNING_LAW', 'the laws of Kenya'),

    'contact_email' => env('CONTACT_EMAIL', env('MAIL_FROM_ADDRESS', 'hello@example.com')),
    'hr_email' => env('HR_EMAIL', env('CONTACT_EMAIL', env('MAIL_FROM_ADDRESS', 'hello@example.com'))),
    'phone' => env('SITE_PHONE'),
    'address' => env('SITE_ADDRESS'),

    'linkedin_company_url' => env('LINKEDIN_COMPANY_URL'),

    // Hashtags appended to LinkedIn job posts (without the #).
    'hashtags' => array_filter(explode(',', env('SITE_HASHTAGS', 'Hiring,Careers,Kenya'))),

    'terms_updated' => env('SITE_TERMS_UPDATED', '21 October 2026'),
];

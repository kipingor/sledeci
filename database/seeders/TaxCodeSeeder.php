<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\TaxCode;

/**
 * TaxCodeSeeder
 *
 * Scope: Africa-focused CRM, IFRS-compliant.
 *
 * TYPE TAXONOMY
 * ─────────────────────────────────────────────────────────────────────────────
 *  vat          Consumption tax charged on the sale of goods/services.
 *               Includes standard, reduced, and zero-rated VAT variants.
 *  exempt       Transactions outside the VAT system entirely (no tax, no credit).
 *  withholding  Tax deducted at source by the payer before remitting to payee.
 *               Covers WHT on services, dividends, royalties, and interest.
 *  income_tax   Direct taxes on income: PAYE, corporate tax, CGT, rental income.
 *  payroll      Employment-related levies: NSSF, NHIF, NI. Separate from PAYE
 *               because payroll levies are often capped/flat, not progressive.
 *  excise       Excise duties, digital services tax, environmental and luxury levies.
 *  transfer     Taxes on the transfer of assets: stamp duty, inheritance, gift tax.
 *  sales_tax    Non-VAT turnover-based taxes: Turnover Tax (TOT), simplified SME taxes.
 *
 * RATE CONVENTION
 * ─────────────────────────────────────────────────────────────────────────────
 *  Rates are stored as decimals (0.16 = 16%).
 *  Variable/progressive rates (PAYE, Corporate Tax tiers) are stored as 0.00
 *  because the actual rate is calculated at runtime against the tax table.
 *  The `rate` column should be treated as the *default* or *primary* rate only.
 */
class TaxCodeSeeder extends Seeder
{
    public function run(): void
    {
        $taxCodes = [

            // ── VAT ───────────────────────────────────────────────────────────
            // Standard rates in use across major African markets:
            //   Kenya 16%, South Africa 15%, Nigeria 7.5%, Tanzania/Uganda 18%,
            //   Egypt 14%, Ethiopia 15%, Ghana 15%.
            // We seed the most common reference rates; the accounting module
            // should allow country-level overrides in settings.

            ['code' => 'VAT0',   'name' => 'VAT Exempt',           'type' => 'exempt',  'rate' => 0.00],
            ['code' => 'VAT0Z',  'name' => 'Zero-Rated VAT',       'type' => 'vat',     'rate' => 0.00],
            ['code' => 'VAT0R',  'name' => 'VAT Reverse Charge',   'type' => 'vat',     'rate' => 0.00],
            ['code' => 'VAT5',   'name' => 'VAT 5%',               'type' => 'vat',     'rate' => 0.05],
            ['code' => 'VAT7_5', 'name' => 'VAT 7.5% (Nigeria)',   'type' => 'vat',     'rate' => 0.075],
            ['code' => 'VAT10',  'name' => 'VAT 10%',              'type' => 'vat',     'rate' => 0.10],
            ['code' => 'VAT14',  'name' => 'VAT 14% (Egypt)',      'type' => 'vat',     'rate' => 0.14],
            ['code' => 'VAT15',  'name' => 'VAT 15% (SA/ETH/GHA)', 'type' => 'vat',     'rate' => 0.15],
            ['code' => 'VAT16',  'name' => 'VAT 16% (Kenya)',      'type' => 'vat',     'rate' => 0.16],
            ['code' => 'VAT18',  'name' => 'VAT 18% (TZA/UGA)',    'type' => 'vat',     'rate' => 0.18],
            ['code' => 'VAT20',  'name' => 'VAT 20%',              'type' => 'vat',     'rate' => 0.20],

            // ── Withholding Tax ───────────────────────────────────────────────
            // WHT is the most widely used direct tax mechanism in African B2B
            // transactions. Each category has a distinct statutory rate.
            // Rates below reflect Kenya KRA defaults; other markets are similar.

            ['code' => 'WHT5',   'name' => 'WHT — Services (Resident)',     'type' => 'withholding', 'rate' => 0.05],
            ['code' => 'WHT10',  'name' => 'WHT — Dividends / Rent',        'type' => 'withholding', 'rate' => 0.10],
            ['code' => 'WHT15',  'name' => 'WHT — Royalties / Interest',    'type' => 'withholding', 'rate' => 0.15],
            ['code' => 'WHT20',  'name' => 'WHT — Non-Resident Services',   'type' => 'withholding', 'rate' => 0.20],
            ['code' => 'WHTNR',  'name' => 'WHT — Non-Resident Variable',   'type' => 'withholding', 'rate' => 0.00],

            // ── Income Tax ────────────────────────────────────────────────────

            ['code' => 'PAYE',   'name' => 'Pay As You Earn (PAYE)',        'type' => 'income_tax', 'rate' => 0.00],
            ['code' => 'PAYE30', 'name' => 'PAYE Top Rate',                 'type' => 'income_tax', 'rate' => 0.30],
            ['code' => 'CT',     'name' => 'Corporate Tax',                 'type' => 'income_tax', 'rate' => 0.30],
            ['code' => 'CT25',   'name' => 'Corporate Tax 25% (SME/SEZ)',   'type' => 'income_tax', 'rate' => 0.25],
            ['code' => 'CGT',    'name' => 'Capital Gains Tax',             'type' => 'income_tax', 'rate' => 0.05],
            ['code' => 'RIT',    'name' => 'Rental Income Tax',             'type' => 'income_tax', 'rate' => 0.10],
            ['code' => 'DIV',    'name' => 'Dividend Tax',                  'type' => 'income_tax', 'rate' => 0.15],
            ['code' => 'INT',    'name' => 'Interest Income Tax',           'type' => 'income_tax', 'rate' => 0.15],

            // ── Payroll Levies ────────────────────────────────────────────────
            // Kept separate from income_tax because these are employment
            // contributions — often capped — not progressive income taxes.

            ['code' => 'NSSF',   'name' => 'NSSF Contribution',            'type' => 'payroll', 'rate' => 0.06],
            ['code' => 'NHIF',   'name' => 'NHIF / SHA Contribution',      'type' => 'payroll', 'rate' => 0.00],
            ['code' => 'NI',     'name' => 'National Insurance',           'type' => 'payroll', 'rate' => 0.00],

            // ── Excise & Digital ──────────────────────────────────────────────

            ['code' => 'EXCISE', 'name' => 'Excise Duty',                  'type' => 'excise', 'rate' => 0.00],
            ['code' => 'DST',    'name' => 'Digital Services Tax (1.5%)',  'type' => 'excise', 'rate' => 0.015],
            ['code' => 'ENV',    'name' => 'Environmental Levy',           'type' => 'excise', 'rate' => 0.00],

            // ── Transfer / Stamp ──────────────────────────────────────────────

            ['code' => 'STAMP',   'name' => 'Stamp Duty',                  'type' => 'transfer', 'rate' => 0.04],
            ['code' => 'INHERIT', 'name' => 'Inheritance / Estate Tax',    'type' => 'transfer', 'rate' => 0.02],

            // ── Sales / Turnover ──────────────────────────────────────────────
            // Turnover Tax (TOT) is a simplified SME tax used in Kenya (1%),
            // South Africa (3%), and similar schemes across the continent.
            // It replaces VAT registration for qualifying small businesses.

            ['code' => 'TOT',    'name' => 'Turnover Tax (TOT)',           'type' => 'sales_tax', 'rate' => 0.01],
            ['code' => 'IMPORT', 'name' => 'Import / Customs Duty',        'type' => 'sales_tax', 'rate' => 0.00],

            // ── Catch-all ─────────────────────────────────────────────────────

            ['code' => 'EXEMPT', 'name' => 'Tax Exempt (General)',         'type' => 'exempt', 'rate' => 0.00],
        ];

        foreach ($taxCodes as $taxCode) {
            TaxCode::firstOrCreate(['code' => $taxCode['code']], $taxCode);
        }
    }
}

<?php

namespace Sledeci\KenyaPayroll\Services;

/**
 * Pure calculator for Kenyan statutory payroll deductions.
 *
 * Rates below reflect KRA / NSSF / SHA guidance current as of mid-2026:
 *  - PAYE:        5-band progressive system, Finance Act 2023 (10%–35%)
 *  - NSSF:        6% employee + 6% employer, pensionable pay capped at KES 108,000
 *                 (Year 4 upper earnings limit, effective Feb 2026)
 *  - SHIF:        2.75% of gross pay, KES 300 monthly minimum (replaced NHIF, Oct 2024)
 *  - Housing Levy: 1.5% of gross pay, employee side (employer matches 1.5%,
 *                  tracked separately at the accounting/journal level, not per payslip)
 *
 * These are statutory rates and change periodically via Finance Acts / KRA
 * notices — review this class whenever a new Finance Act or NSSF/SHIF
 * circular takes effect.
 */
class KenyaPayrollService
{
    private const NSSF_PENSIONABLE_CEILING = 108_000.0; // upper earnings limit
    private const NSSF_RATE = 0.06;                      // employee rate, employer matches
    private const NSSF_MAX_EMPLOYEE = 6_480.0;           // 6% of 108,000

    private const SHIF_RATE = 0.0275; // 2.75% of gross
    private const SHIF_MIN = 300.0;   // monthly minimum contribution

    private const HOUSING_LEVY_RATE = 0.015; // 1.5% of gross, employee side

    private const PERSONAL_RELIEF = 2_400.0; // monthly, resident employees

    /**
     * PAYE bands: [lower bound, upper bound, rate]. Applied progressively.
     */
    private const PAYE_BANDS = [
        [0.0, 24_000.0, 0.10],
        [24_000.0, 32_333.0, 0.25],
        [32_333.0, 500_000.0, 0.30],
        [500_000.0, 800_000.0, 0.325],
        [800_000.0, PHP_FLOAT_MAX, 0.35],
    ];

    /**
     * Compute a full payslip breakdown for one employee for one pay period.
     *
     * @return array{
     *     gross_pay: float, paye: float, nhif: float,
     *     nssf_employee: float, nssf_employer: float, housing_levy: float,
     *     helb: float, other_deductions: float, total_deductions: float, net_pay: float
     * }
     */
    public function compute(
        float $basicSalary,
        float $houseAllowance = 0.0,
        float $transportAllowance = 0.0,
        float $otherAllowances = 0.0,
        float $helb = 0.0,
        float $otherDeductions = 0.0,
    ): array {
        $grossPay = round($basicSalary + $houseAllowance + $transportAllowance + $otherAllowances, 2);

        $nssfEmployee = $this->nssf($basicSalary);
        $nssfEmployer = $nssfEmployee; // employer matches employee's contribution

        $shif = $this->shif($grossPay);
        $housingLevy = round($grossPay * self::HOUSING_LEVY_RATE, 2);

        // NSSF, SHIF, and the Housing Levy are all deducted before PAYE is applied.
        $taxablePay = max($grossPay - $nssfEmployee - $shif - $housingLevy, 0.0);
        $paye = $this->paye($taxablePay);

        $helb = round($helb, 2);
        $otherDeductions = round($otherDeductions, 2);

        $totalDeductions = round($paye + $shif + $nssfEmployee + $housingLevy + $helb + $otherDeductions, 2);
        $netPay = round($grossPay - $totalDeductions, 2);

        return [
            'gross_pay' => $grossPay,
            'paye' => $paye,
            'nhif' => $shif, // column name kept for schema compatibility; value is SHIF
            'nssf_employee' => $nssfEmployee,
            'nssf_employer' => $nssfEmployer,
            'housing_levy' => $housingLevy,
            'helb' => $helb,
            'other_deductions' => $otherDeductions,
            'total_deductions' => $totalDeductions,
            'net_pay' => $netPay,
        ];
    }

    private function nssf(float $pensionablePay): float
    {
        $pensionable = min($pensionablePay, self::NSSF_PENSIONABLE_CEILING);

        return round(min($pensionable * self::NSSF_RATE, self::NSSF_MAX_EMPLOYEE), 2);
    }

    private function shif(float $grossPay): float
    {
        return round(max($grossPay * self::SHIF_RATE, self::SHIF_MIN), 2);
    }

    private function paye(float $taxablePay): float
    {
        $tax = 0.0;

        foreach (self::PAYE_BANDS as [$from, $to, $rate]) {
            if ($taxablePay <= $from) {
                break;
            }
            $tax += (min($taxablePay, $to) - $from) * $rate;
        }

        return round(max($tax - self::PERSONAL_RELIEF, 0.0), 2);
    }
}

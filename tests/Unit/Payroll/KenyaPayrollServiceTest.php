<?php

namespace Tests\Unit\Payroll;

use App\Services\Payroll\KenyaPayrollService;
use PHPUnit\Framework\TestCase;

/**
 * Expected figures were worked out by hand from the statutory rules
 * (NSSF 6% capped at KES 108,000; SHIF 2.75% min 300; Housing Levy 1.5%;
 * PAYE bands 10/25/30/32.5/35% with KES 2,400 personal relief).
 */
class KenyaPayrollServiceTest extends TestCase
{
    private KenyaPayrollService $svc;

    protected function setUp(): void
    {
        $this->svc = new KenyaPayrollService;
    }

    public function test_mid_salary_100k_breakdown(): void
    {
        $r = $this->svc->compute(100_000);

        $this->assertSame(100_000.0, $r['gross_pay']);
        $this->assertSame(6_000.0, $r['nssf_employee']);
        $this->assertSame(2_750.0, $r['nhif']);          // SHIF 2.75%
        $this->assertSame(1_500.0, $r['housing_levy']);
        // taxable = 100,000 - 6,000 - 2,750 - 1,500 = 89,750
        // tax = 2,400 + 2,083.25 + 17,225.10 = 21,708.35 ; less relief 2,400
        $this->assertSame(19_308.35, $r['paye']);
        $this->assertSame(29_558.35, $r['total_deductions']);
        $this->assertSame(70_441.65, $r['net_pay']);
    }

    public function test_low_income_pays_no_paye_and_shif_minimum_applies(): void
    {
        $r = $this->svc->compute(8_000);

        $this->assertSame(0.0, $r['paye']);              // below personal relief
        $this->assertSame(300.0, $r['nhif']);            // 2.75% of 8,000 = 220 -> minimum 300
    }

    public function test_nssf_is_capped_at_the_upper_earnings_limit(): void
    {
        $r = $this->svc->compute(500_000);

        $this->assertSame(6_480.0, $r['nssf_employee']);
        $this->assertSame(6_480.0, $r['nssf_employer']);
    }

    public function test_net_pay_reconciles_for_a_range_of_salaries(): void
    {
        foreach ([0, 15_000, 24_000, 32_333, 75_000, 250_000, 900_000] as $basic) {
            $r = $this->svc->compute((float) $basic, 5_000, 2_000, 1_000, 500, 250);

            $this->assertEqualsWithDelta($r['gross_pay'] - $r['total_deductions'], $r['net_pay'], 0.01, "basic={$basic}");
            $this->assertGreaterThanOrEqual(0.0, $r['paye'], "basic={$basic}");
        }
    }

    public function test_paye_is_monotonic_in_salary(): void
    {
        $previous = -1.0;
        foreach (range(10_000, 1_000_000, 10_000) as $basic) {
            $paye = $this->svc->compute((float) $basic)['paye'];
            $this->assertGreaterThanOrEqual($previous, $paye, "PAYE decreased at basic={$basic}");
            $previous = $paye;
        }
    }

    public function test_helb_and_other_deductions_reduce_net_but_not_tax(): void
    {
        $base = $this->svc->compute(100_000);
        $with = $this->svc->compute(100_000, 0, 0, 0, 1_000, 500);

        $this->assertSame($base['paye'], $with['paye']);
        $this->assertEqualsWithDelta($base['net_pay'] - 1_500, $with['net_pay'], 0.01);
    }
}

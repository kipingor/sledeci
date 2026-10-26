<?php

namespace Sledeci\Accounting\Http\Controllers;

use Sledeci\Core\Http\Controller;
use Sledeci\Accounting\Services\Financing\InvoiceFinancingService;
use App\Models\CompanySetting;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class FinancingController extends Controller
{
    public function __construct(private InvoiceFinancingService $financing) {}

    public function report(): Response
    {
        $functional = config('company.functional_currency', 'KES');
        $report     = $this->financing->buildReport($functional);

        return Inertia::render('financing/report', compact('report'));
    }

    /** JSON export for sharing with a lender/fintech */
    public function export()
    {
        $functional = config('company.functional_currency', 'KES');
        $report     = $this->financing->buildReport($functional);
        $company    = CompanySetting::current();

        return response()->json([
            'company' => [
                'name'    => $company->company_name,
                'kra_pin' => $company->kra_pin,
            ],
            'report' => $report,
        ])->header('Content-Disposition', 'attachment; filename="financing-report-' . now()->format('Y-m-d') . '.json"');
    }
}
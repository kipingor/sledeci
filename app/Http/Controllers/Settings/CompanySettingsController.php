<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\CompanySetting;
use Sledeci\KenyaTax\Services\EtimsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class CompanySettingsController extends Controller
{
    /**
     * 
     */
    public function edit()
    {
        return Inertia::render('settings/company', [
            'settings' => CompanySetting::current(),
        ]);
    }
 
    public function update(Request $request)
    {
        $data = $request->validate([
            // Identity
            'company_name'    => 'nullable|string|max:255',
            'company_email'   => 'nullable|email|max:255',
            'company_phone'   => 'nullable|string|max:50',
            'company_address' => 'nullable|string|max:500',
            'company_city'    => 'nullable|string|max:100',
            'company_country' => 'nullable|string|size:2',
 
            // Tax / KRA
            'kra_pin'          => ['nullable', 'string', 'max:20', 'regex:/^[A-Z]\d{9}[A-Z]$/'],
            'kra_branch_name'  => 'nullable|string|max:100',
            'kra_branch_id'    => 'nullable|string|max:10',
            'vat_number'       => 'nullable|string|max:50',
            'default_vat_rate' => 'nullable|numeric|min:0|max:100',
            'vat_registered'   => 'boolean',
 
            // eTIMS
            'etims_enabled'         => 'boolean',
            'etims_environment'     => 'in:sandbox,production',
            'etims_device_serial'   => 'nullable|string|max:100',
            'etims_branch_id'       => 'nullable|string|max:10',
            'etims_taxpayer_pin'    => ['nullable', 'string', 'max:20', 'regex:/^[A-Z]\d{9}[A-Z]$/'],
            'etims_auto_submit'     => 'boolean',
            'etims_invoice_prefix'  => 'nullable|string|max:10',
 
            // Financial
            'default_currency'  => 'nullable|string|size:3',
            'fiscal_year_start' => 'nullable|string|regex:/^\d{2}-\d{2}$/',
 
            // Maker-checker
            'maker_checker_enabled'         => 'boolean',
            'maker_checker_tenders'         => 'boolean',
            'maker_checker_rfp'             => 'boolean',
            'maker_checker_invoices'        => 'boolean',
            'maker_checker_purchase_orders' => 'boolean',
            'maker_checker_min_approvals'   => 'nullable|integer|min:1|max:10',
            'maker_checker_approver_roles'  => 'nullable|array',
            'maker_checker_approver_roles.*'=> 'string',
 
            // Notifications
            'notify_on_approval_request' => 'boolean',
            'notify_on_approval_decision'=> 'boolean',
            'notify_on_etims_failure'    => 'boolean',
        ]);
 
        CompanySetting::current()->update($data);
 
        return back()->with('success', 'Company settings saved.');
    }
 
    public function uploadLogo(Request $request)
    {
        $request->validate(['logo' => 'required|image|mimes:png,jpg,jpeg,svg|max:2048']);
 
        $settings = CompanySetting::current();
 
        // Delete old logo
        if ($settings->company_logo_path) {
            Storage::disk('public')->delete($settings->company_logo_path);
        }
 
        $path = $request->file('logo')->store('logos', 'public');
        $settings->update(['company_logo_path' => $path]);
 
        return back()->with('success', 'Logo updated.');
    }
 
    public function testEtims()
    {
        try {
            $result = app(EtimsService::class)->testConnection();
            return response()->json($result);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }
}

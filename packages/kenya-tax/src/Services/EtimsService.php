<?php

namespace Sledeci\KenyaTax\Services;

use App\Models\CompanySetting;
use Sledeci\Accounting\Models\Invoice;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * eTIMS (Electronic Tax Invoice Management System) Service
 *
 * Implements the KRA eTIMS API v3 specification.
 * Supports both OSCU (Online Sales Control Unit) and VSCU (Virtual SCU).
 *
 * KRA eTIMS API Docs: https://www.kra.go.ke/etims
 * Sandbox base URL:   https://etims-sbx.kra.go.ke/etims-api
 * Production base URL: https://etims.kra.go.ke/etims-api
 */
class EtimsService
{
    private const SANDBOX_URL    = 'https://etims-sbx.kra.go.ke/etims-api';
    private const PRODUCTION_URL = 'https://etims.kra.go.ke/etims-api';

    private CompanySetting $settings;
    private string $baseUrl;

    public function __construct()
    {
        $this->settings = CompanySetting::current();
        $this->baseUrl  = $this->settings->etims_environment === 'production'
            ? self::PRODUCTION_URL
            : self::SANDBOX_URL;
    }

    // ── Public API ─────────────────────────────────────────────────────────────

    /**
     * Submit an invoice to eTIMS.
     * Returns an array with: success, etims_invoice_number, cu_invoice_number, qr_url
     */
    public function submitInvoice(Invoice $invoice): array
    {
        if (! $this->settings->etims_enabled) {
            throw new \RuntimeException('eTIMS is not enabled in company settings.');
        }

        $payload = $this->buildInvoicePayload($invoice);

        try {
            $response = $this->post('/trnsSalesSaveWr', $payload);

            if ($response['resultCd'] !== '000') {
                throw new \RuntimeException(
                    'eTIMS error ' . $response['resultCd'] . ': ' . ($response['resultMsg'] ?? 'Unknown error')
                );
            }

            $data = $response['data'] ?? [];

            $invoice->update([
                'etims_invoice_number'  => $data['invcNo']      ?? null,
                'etims_cu_invoice_number' => $data['rcptSign']  ?? null,
                'etims_status'          => 'submitted',
                'etims_submitted_at'    => now(),
                'etims_response'        => $response,
                'etims_qr_url'          => $this->buildQrUrl($data),
            ]);

            Log::info('eTIMS invoice submitted', [
                'invoice_id' => $invoice->id,
                'etims_no'   => $data['invcNo'] ?? null,
            ]);

            return [
                'success'              => true,
                'etims_invoice_number' => $data['invcNo']    ?? null,
                'cu_invoice_number'    => $data['rcptSign']  ?? null,
                'qr_url'               => $this->buildQrUrl($data),
            ];
        } catch (\Throwable $e) {
            Log::error('eTIMS submission failed', [
                'invoice_id' => $invoice->id,
                'error'      => $e->getMessage(),
            ]);

            $invoice->update([
                'etims_status'   => 'rejected',
                'etims_response' => ['error' => $e->getMessage()],
            ]);

            throw $e;
        }
    }

    /**
     * Initialize/register the device with eTIMS.
     * Required before first use — call once during setup.
     */
    public function initializeDevice(): array
    {
        return $this->post('/initializer/selectInitOsdc', [
            'tin'    => $this->settings->etims_taxpayer_pin,
            'dvcSrlNo' => $this->settings->etims_device_serial,
            'bhfId'  => $this->settings->etims_branch_id ?? '00',
        ]);
    }

    /**
     * Fetch standard codes (item types, tax codes, etc.) from eTIMS.
     * Returns the standard codes needed for invoice line classification.
     */
    public function fetchStandardCodes(?string $lastReqDt = null): array
    {
        return $this->post('/code/selectCodeList', [
            'lastReqDt' => $lastReqDt ?? '20000101000000',
        ]);
    }

    /**
     * Fetch item classification codes from eTIMS.
     */
    public function fetchItemClassifications(?string $lastReqDt = null): array
    {
        return $this->post('/itemClass/selectItemsClass', [
            'lastReqDt' => $lastReqDt ?? '20000101000000',
        ]);
    }

    /**
     * Verify the connection and credentials are working.
     */
    public function testConnection(): array
    {
        try {
            $result = $this->initializeDevice();
            return [
                'success' => ($result['resultCd'] ?? '') === '000',
                'message' => $result['resultMsg'] ?? 'Connection test failed',
            ];
        } catch (\Throwable $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    // ── Payload Builder ────────────────────────────────────────────────────────

    private function buildInvoicePayload(Invoice $invoice): array
    {
        $settings   = $this->settings;
        $lines      = collect($invoice->lines ?? []);
        $invoiceDate = $invoice->issue_date->format('Ymd');
        $invoiceTime = now()->format('His');

        // Map invoice lines to eTIMS item list
        $itemList = $lines->map(function ($line, $idx) {
            $qty      = (float) ($line['quantity'] ?? 1);
            $price    = (float) ($line['unit_price'] ?? 0);
            $amount   = round($qty * $price, 2);
            $taxAmt   = round($amount * 0.16, 2);   // 16% VAT standard rate
            $taxblAmt = round($amount - $taxAmt, 2);

            return [
                'itemSeq'       => $idx + 1,
                'itemCd'        => $line['item_code'] ?? ('ITEM' . str_pad($idx + 1, 3, '0', STR_PAD_LEFT)),
                'itemClsCd'     => $line['item_class_code'] ?? '5020230602', // default goods
                'itemNm'        => $line['description'] ?? 'Goods/Service',
                'bcd'           => null,
                'pkgUnitCd'     => 'U',   // Unit
                'pkg'           => $qty,
                'qtyUnitCd'     => 'U',
                'qty'           => $qty,
                'prc'           => $price,
                'splyAmt'       => $amount,
                'dcRt'          => 0,
                'dcAmt'         => 0,
                'isrccCd'       => null,
                'isrccNm'       => null,
                'isrcRt'        => 0,
                'isrcAmt'       => 0,
                'taxTyCd'       => 'B',   // VAT standard
                'taxblAmt'      => $taxblAmt,
                'taxAmt'        => $taxAmt,
                'totAmt'        => $amount,
            ];
        })->values()->toArray();

        $subtotal = $lines->sum(fn($l) => (float) ($l['amount'] ?? 0));
        $taxAmt   = round($subtotal * 0.16, 2);

        return [
            'tpin'       => $settings->etims_taxpayer_pin,
            'bhfId'      => $settings->etims_branch_id ?? '00',
            'orgInvcNo'  => 0,   // 0 for new invoice
            'cisInvcNo'  => $invoice->number,
            'custTpin'   => $invoice->buyer_kra_pin,
            'custNm'     => $invoice->buyer_name,
            'salesTyCd'  => 'N',  // Normal sale
            'rcptTyCd'   => 'S',  // Sales receipt
            'pmtTyCd'    => '01', // Cash — adjust per payment method
            'salesSttsCd'=> '02', // Approved
            'cfmDt'      => $invoiceDate . $invoiceTime,
            'salesDt'    => $invoiceDate,
            'stockRlsDt' => null,
            'cnclReqDt'  => null,
            'cnclDt'     => null,
            'rfdDt'      => null,
            'rfdRsnCd'   => null,
            'totItemCnt' => count($itemList),
            'taxblAmtA'  => 0,
            'taxblAmtB'  => $subtotal - $taxAmt,
            'taxblAmtC'  => 0,
            'taxblAmtD'  => 0,
            'taxblAmtE'  => 0,
            'taxRtA'     => 0,
            'taxRtB'     => 16,
            'taxRtC'     => 0,
            'taxRtD'     => 0,
            'taxRtE'     => 0,
            'taxAmtA'    => 0,
            'taxAmtB'    => $taxAmt,
            'taxAmtC'    => 0,
            'taxAmtD'    => 0,
            'taxAmtE'    => 0,
            'totTaxblAmt'=> $subtotal - $taxAmt,
            'totTaxAmt'  => $taxAmt,
            'totAmt'     => $subtotal,
            'prchrAcptcYn' => 'N',
            'remark'     => $invoice->notes,
            'regrId'     => auth()->id() ?? 'SYSTEM',
            'regrNm'     => auth()->user()?->name ?? 'System',
            'modrId'     => auth()->id() ?? 'SYSTEM',
            'modrNm'     => auth()->user()?->name ?? 'System',
            'itemList'   => $itemList,
        ];
    }

    private function buildQrUrl(array $data): ?string
    {
        if (empty($data['rcptSign'])) return null;
        $pin = $this->settings->etims_taxpayer_pin;
        $no  = $data['invcNo'] ?? '';
        $sig = $data['rcptSign'] ?? '';
        return "https://itax.kra.go.ke/KRA-Portal/invoiceChk.htm?actionCode=loadPage&invoiceNo={$no}&traderPin={$pin}&sign={$sig}";
    }

    // ── HTTP Client ────────────────────────────────────────────────────────────

    private function post(string $path, array $data): array
    {
        $response = Http::withHeaders([
            'Content-Type'   => 'application/json',
            'tin'            => $this->settings->etims_taxpayer_pin,
            'bhfId'          => $this->settings->etims_branch_id ?? '00',
            'cmcKey'         => $this->settings->etims_device_serial ?? '',
        ])
        ->timeout(30)
        ->post($this->baseUrl . $path, $data);

        if ($response->failed()) {
            throw new \RuntimeException(
                "eTIMS HTTP error {$response->status()}: " . $response->body()
            );
        }

        return $response->json();
    }
}
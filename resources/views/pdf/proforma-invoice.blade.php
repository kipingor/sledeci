<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'DejaVu Sans', Arial, sans-serif; font-size: 9.5pt; color: #1a1a2e; background: #fff; }
.header { background: #111827; color: #fff; padding: 22px 30px; display: table; width: 100%; }
.header-left  { display: table-cell; vertical-align: middle; width: 60%; }
.header-right { display: table-cell; vertical-align: top; text-align: right; }
.company-name { font-size: 17pt; font-weight: bold; color: #F59E0B; }
.company-sub  { font-size: 7.5pt; color: #9ca3af; margin-top: 2px; }
.doc-label    { font-size: 9pt; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.8px; }
.doc-number   { font-size: 15pt; font-weight: bold; color: #fff; margin-top: 3px; font-family: monospace; }
.accent-bar   { background: #F59E0B; height: 4px; }
.body         { padding: 24px 30px; }
.section-title { font-size: 7pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.8px; color: #6b7280; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; margin: 14px 0 8px; }
.row   { display: table; width: 100%; margin-bottom: 10px; }
.col-l { display: table-cell; width: 50%; vertical-align: top; padding-right: 14px; }
.col-r { display: table-cell; width: 50%; vertical-align: top; padding-left: 14px; }
.col-3 { display: table-cell; width: 33%; vertical-align: top; padding-right: 10px; }
.field-label { font-size: 7.5pt; color: #9ca3af; margin-bottom: 2px; }
.field-value { font-size: 9.5pt; font-weight: bold; }
table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 8.5pt; }
th { background: #111827; color: #fff; font-size: 7pt; text-transform: uppercase; letter-spacing: 0.5px; padding: 5px 8px; text-align: left; }
td { padding: 5.5px 8px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
tr:nth-child(even) td { background: #f9fafb; }
.text-right  { text-align: right; }
.text-center { text-align: center; }
.font-mono   { font-family: monospace; }
.total-row td { background: #111827 !important; color: #fff; font-weight: bold; font-size: 10pt; }
.total-row .text-right { text-align: right; }
.notice-box { border: 1px solid #fcd34d; background: #fffbeb; border-radius: 4px; padding: 10px 14px; margin-top: 14px; font-size: 8.5pt; color: #78350f; }
.sig-table { display: table; width: 100%; margin-top: 24px; }
.sig-cell  { display: table-cell; width: 33%; vertical-align: bottom; padding-right: 16px; }
.sig-line  { border-top: 1px solid #374151; padding-top: 6px; font-size: 8pt; }
.footer { background: #111827; color: #6b7280; text-align: center; padding: 10px; font-size: 7.5pt; margin-top: 30px; }
</style>
</head>
<body>

<div class="header">
    <div class="header-left">
        <div class="company-name">{{ $company['name'] ?? 'Company Name' }}</div>
        <div class="company-sub">{{ $company['address'] ?? '' }} · {{ $company['email'] ?? '' }}</div>
    </div>
    <div class="header-right">
        <div class="doc-label">Pro-forma Invoice</div>
        <div class="doc-number">{{ $document->document_number }}</div>
        <div style="font-size:8pt; color:#9ca3af; margin-top:4px;">Date: {{ now()->format('d M Y') }}</div>
    </div>
</div>
<div class="accent-bar"></div>

<div class="body">

    <!-- Seller / Buyer -->
    <div class="section-title">Parties</div>
    <div class="row">
        <div class="col-l">
            <div class="field-label">Seller / Exporter</div>
            <div class="field-value">{{ $document->exporter_name }}</div>
            <div style="margin-top:3px; font-size:8.5pt; color:#374151; line-height:1.4;">{{ nl2br(e($document->exporter_address)) }}</div>
            @if($document->exporter_kra_pin)
            <div style="margin-top:4px; font-size:7.5pt; color:#6b7280;">KRA PIN: <span class="font-mono">{{ $document->exporter_kra_pin }}</span></div>
            @endif
        </div>
        <div class="col-r">
            <div class="field-label">Buyer / Importer</div>
            <div class="field-value">{{ $document->importer_name }}</div>
            <div style="margin-top:3px; font-size:8.5pt; color:#374151; line-height:1.4;">{{ nl2br(e($document->importer_address)) }}</div>
            @if($document->importer_tax_id)
            <div style="margin-top:4px; font-size:7.5pt; color:#6b7280;">Tax ID: <span class="font-mono">{{ $document->importer_tax_id }}</span></div>
            @endif
        </div>
    </div>

    <!-- Shipment details -->
    <div class="section-title">Shipment Details</div>
    <div class="row">
        <div class="col-3">
            <div class="field-label">Origin → Destination</div>
            <div class="field-value">{{ $document->origin_country }} → {{ $document->destination_country }}</div>
        </div>
        <div class="col-3">
            <div class="field-label">Mode of Transport</div>
            <div class="field-value">{{ ucfirst($document->transport_mode ?? '—') }}</div>
        </div>
        <div class="col-3">
            <div class="field-label">Estimated Ship Date</div>
            <div class="field-value">{{ $document->departure_date?->format('d M Y') ?? '—' }}</div>
        </div>
    </div>

    @if($document->vehicle_reg || $document->border_post)
    <div class="row">
        <div class="col-l">
            <div class="field-label">Vehicle / Vessel</div>
            <div class="field-value font-mono">{{ $document->vehicle_reg ?? '—' }}</div>
        </div>
        <div class="col-r">
            <div class="field-label">Port / Border Post</div>
            <div class="field-value">{{ $document->border_post ?? '—' }}</div>
        </div>
    </div>
    @endif

    <!-- Line items -->
    <div class="section-title">Itemised Description of Goods</div>
    <table>
        <thead>
            <tr>
                <th width="4%">#</th>
                <th width="32%">Description</th>
                <th width="12%">HS Code</th>
                <th class="text-right" width="10%">Qty</th>
                <th width="8%">Unit</th>
                <th class="text-right" width="16%">Unit Price ({{ $document->currency }})</th>
                <th class="text-right" width="18%">Line Total ({{ $document->currency }})</th>
            </tr>
        </thead>
        <tbody>
            @php $subtotal = 0; @endphp
            @foreach($document->items ?? [] as $i => $item)
            @php
                $lineTotal = ($item['quantity'] ?? 0) * ($item['unit_price'] ?? $item['value'] ?? 0);
                if ($lineTotal === 0 && isset($item['value'])) $lineTotal = $item['value'];
                $subtotal += $lineTotal;
            @endphp
            <tr>
                <td class="text-center">{{ $i + 1 }}</td>
                <td>{{ $item['description'] ?? '' }}</td>
                <td class="font-mono text-center">{{ $item['hs_code'] ?? '—' }}</td>
                <td class="text-right">{{ number_format($item['quantity'] ?? 0, 2) }}</td>
                <td>{{ $item['unit'] ?? 'pcs' }}</td>
                <td class="text-right">{{ number_format($item['unit_price'] ?? ($item['value'] ?? 0), 2) }}</td>
                <td class="text-right">{{ number_format($lineTotal, 2) }}</td>
            </tr>
            @endforeach
        </tbody>
        <tfoot>
            <tr>
                <td colspan="6" style="text-align:right; font-weight:bold; background:#f3f4f6; font-size:8pt;">TOTAL INVOICE VALUE</td>
                <td class="text-right" style="font-weight:bold; background:#111827; color:#F59E0B; font-size:11pt;">
                    {{ $document->currency }} {{ number_format($document->total_value, 2) }}
                </td>
            </tr>
        </tfoot>
    </table>

    <!-- Weight summary -->
    <div class="row" style="margin-top:12px;">
        <div class="col-3">
            <div class="field-label">Total Gross Weight</div>
            <div class="field-value">{{ number_format($document->total_gross_weight ?? 0, 3) }} kg</div>
        </div>
        <div class="col-3">
            <div class="field-label">Total Net Weight</div>
            <div class="field-value">{{ number_format($document->total_net_weight ?? 0, 3) }} kg</div>
        </div>
        <div class="col-3">
            <div class="field-label">Currency</div>
            <div class="field-value">{{ $document->currency }}</div>
        </div>
    </div>

    @if($document->notes)
    <div class="row" style="margin-top:8px;">
        <div style="display:table-cell;">
            <div class="field-label">Payment Terms / Incoterms</div>
            <div style="font-size:8.5pt; margin-top:3px;">{{ $document->notes }}</div>
        </div>
    </div>
    @endif

    <!-- Validity notice -->
    <div class="notice-box">
        <strong>IMPORTANT:</strong> This is a <em>pro-forma invoice</em> for customs valuation and pre-shipment purposes only.
        It does not constitute a formal tax invoice. A commercial invoice will be issued upon shipment / delivery.
        This pro-forma is valid for <strong>30 days</strong> from the date of issue.
    </div>

    <!-- Signatures -->
    <div class="sig-table">
        <div class="sig-cell">
            <div style="height:40px;"></div>
            <div class="sig-line">Authorised Signatory</div>
        </div>
        <div class="sig-cell">
            <div style="height:40px;"></div>
            <div class="sig-line">Title / Position</div>
        </div>
        <div class="sig-cell">
            <div style="height:40px;"></div>
            <div class="sig-line">Date</div>
        </div>
    </div>

</div>

<div class="footer">
    Pro-forma Invoice {{ $document->document_number }} · {{ $company['name'] ?? '' }} · Generated {{ now()->format('d M Y H:i') }}
</div>
</body>
</html>
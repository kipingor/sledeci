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
table.main { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 8.5pt; }
table.main th { background: #111827; color: #fff; font-size: 7pt; text-transform: uppercase; letter-spacing: 0.5px; padding: 5px 7px; text-align: left; }
table.main td { padding: 5.5px 7px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
table.main tr:nth-child(even) td { background: #f9fafb; }
.text-right  { text-align: right; }
.text-center { text-align: center; }
.font-mono   { font-family: monospace; }
.summary-table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 9pt; }
.summary-table td { padding: 7px 12px; border: 1px solid #e5e7eb; }
.summary-table .label-cell { background: #f9fafb; font-weight: bold; font-size: 7.5pt; text-transform: uppercase; letter-spacing: 0.3px; color: #6b7280; width: 40%; }
.summary-table .value-cell { font-size: 11pt; font-weight: bold; }
.marks-box { border: 1px solid #e5e7eb; border-radius: 4px; padding: 12px; margin-top: 12px; min-height: 60px; }
.marks-title { font-size: 7.5pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; margin-bottom: 6px; }
.sig-table { display: table; width: 100%; margin-top: 28px; }
.sig-cell  { display: table-cell; width: 33%; vertical-align: bottom; padding-right: 16px; }
.sig-line  { border-top: 1px solid #374151; padding-top: 6px; font-size: 8pt; }
.footer { background: #111827; color: #6b7280; text-align: center; padding: 10px; font-size: 7.5pt; margin-top: 30px; }
</style>
</head>
<body>

<div class="header">
    <div class="header-left">
        <div class="company-name">{{ $company['name'] ?? 'Company Name' }}</div>
        <div class="company-sub">{{ $company['address'] ?? '' }}</div>
    </div>
    <div class="header-right">
        <div class="doc-label">Packing List</div>
        <div class="doc-number">{{ $document->document_number }}</div>
        <div style="font-size:8pt; color:#9ca3af; margin-top:4px;">Date: {{ now()->format('d M Y') }}</div>
    </div>
</div>
<div class="accent-bar"></div>

<div class="body">

    <!-- Shipper / Consignee -->
    <div class="section-title">Shipper &amp; Consignee</div>
    <div class="row">
        <div class="col-l">
            <div class="field-label">Shipper / Exporter</div>
            <div class="field-value">{{ $document->exporter_name }}</div>
            <div style="margin-top:3px; font-size:8.5pt; color:#374151; line-height:1.4;">{{ nl2br(e($document->exporter_address)) }}</div>
        </div>
        <div class="col-r">
            <div class="field-label">Consignee / Importer</div>
            <div class="field-value">{{ $document->importer_name }}</div>
            <div style="margin-top:3px; font-size:8.5pt; color:#374151; line-height:1.4;">{{ nl2br(e($document->importer_address)) }}</div>
        </div>
    </div>

    <!-- Shipment details -->
    <div class="section-title">Shipment Information</div>
    <div class="row">
        <div class="col-3">
            <div class="field-label">Origin</div>
            <div class="field-value">{{ $document->origin_country }}</div>
        </div>
        <div class="col-3">
            <div class="field-label">Destination</div>
            <div class="field-value">{{ $document->destination_country }}</div>
        </div>
        <div class="col-3">
            <div class="field-label">Mode of Transport</div>
            <div class="field-value">{{ ucfirst($document->transport_mode ?? '—') }}</div>
        </div>
    </div>
    <div class="row">
        <div class="col-3">
            <div class="field-label">Vehicle / Vessel / Flight</div>
            <div class="field-value font-mono">{{ $document->vehicle_reg ?? '—' }}</div>
        </div>
        <div class="col-3">
            <div class="field-label">Port / Border Post</div>
            <div class="field-value">{{ $document->border_post ?? '—' }}</div>
        </div>
        <div class="col-3">
            <div class="field-label">Departure Date</div>
            <div class="field-value">{{ $document->departure_date?->format('d M Y') ?? '—' }}</div>
        </div>
    </div>

    <!-- Packing details table -->
    <div class="section-title">Packing Details</div>
    <table class="main">
        <thead>
            <tr>
                <th width="4%" class="text-center">Item</th>
                <th width="30%">Description of Contents</th>
                <th width="12%" class="text-center">HS Code</th>
                <th width="10%" class="text-right">Qty</th>
                <th width="8%">Unit</th>
                <th width="12%" class="text-right">Gross Wt (kg)</th>
                <th width="12%" class="text-right">Net Wt (kg)</th>
                <th width="12%" class="text-right">Dimensions (cm)</th>
            </tr>
        </thead>
        <tbody>
            @foreach($document->items ?? [] as $i => $item)
            <tr>
                <td class="text-center">{{ $i + 1 }}</td>
                <td>
                    <strong>{{ $item['description'] ?? '' }}</strong>
                </td>
                <td class="font-mono text-center">{{ $item['hs_code'] ?? '—' }}</td>
                <td class="text-right">{{ number_format($item['quantity'] ?? 0, 2) }}</td>
                <td>{{ $item['unit'] ?? 'pcs' }}</td>
                <td class="text-right">{{ number_format($item['gross_weight'] ?? 0, 3) }}</td>
                <td class="text-right">{{ number_format($item['net_weight'] ?? 0, 3) }}</td>
                <td class="text-right text-center font-mono">{{ $item['dimensions'] ?? '—' }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <!-- Totals summary -->
    <table class="summary-table">
        <tr>
            <td class="label-cell">Total Number of Items</td>
            <td class="value-cell">{{ count($document->items ?? []) }}</td>
            <td class="label-cell">Total Gross Weight</td>
            <td class="value-cell">{{ number_format($document->total_gross_weight ?? 0, 3) }} kg</td>
        </tr>
        <tr>
            <td class="label-cell">Total Net Weight</td>
            <td class="value-cell">{{ number_format($document->total_net_weight ?? 0, 3) }} kg</td>
            <td class="label-cell">Total Declared Value</td>
            <td class="value-cell">{{ $document->currency }} {{ number_format($document->total_value, 2) }}</td>
        </tr>
    </table>

    <!-- Marks & numbers -->
    <div class="marks-box">
        <div class="marks-title">Marks &amp; Numbers / Special Handling Instructions</div>
        <div style="font-size:8.5pt; color:#374151; line-height:1.5;">
            {{ $document->notes ?? 'No special marks or instructions.' }}
        </div>
    </div>

    <!-- Certification -->
    <div style="margin-top:14px; padding:10px; border:1px solid #e5e7eb; border-radius:4px; font-size:8.5pt; background:#f9fafb;">
        <strong>CERTIFICATION:</strong> I/We hereby certify that the above packing list is true and correct
        and that the goods described herein are as stated above.
        This packing list accompanies document reference: <strong>{{ $document->document_number }}</strong>.
    </div>

    <!-- Signatures -->
    <div class="sig-table">
        <div class="sig-cell">
            <div style="height:40px;"></div>
            <div class="sig-line">Prepared by</div>
        </div>
        <div class="sig-cell">
            <div style="height:40px;"></div>
            <div class="sig-line">Verified by</div>
        </div>
        <div class="sig-cell">
            <div style="height:40px;"></div>
            <div class="sig-line">Date</div>
        </div>
    </div>

</div>

<div class="footer">
    Packing List {{ $document->document_number }} · {{ $company['name'] ?? '' }} · Generated {{ now()->format('d M Y H:i') }}
</div>
</body>
</html>
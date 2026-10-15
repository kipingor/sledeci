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
.col-l { display: table-cell; width: 50%; vertical-align: top; padding-right: 12px; }
.col-r { display: table-cell; width: 50%; vertical-align: top; padding-left: 12px; }
.col-3 { display: table-cell; width: 33%; vertical-align: top; padding-right: 10px; }
.field-label { font-size: 7.5pt; color: #9ca3af; margin-bottom: 2px; }
.field-value { font-size: 9.5pt; font-weight: bold; }
.field-value.mono { font-family: monospace; }
table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 8.5pt; }
th { background: #111827; color: #fff; font-size: 7pt; text-transform: uppercase; letter-spacing: 0.5px; padding: 5px 7px; text-align: left; }
td { padding: 5px 7px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
tr:nth-child(even) td { background: #f9fafb; }
.text-right { text-align: right; }
.text-center { text-align: center; }
.box { border: 1px solid #d1d5db; border-radius: 4px; padding: 10px; margin-top: 10px; }
.box-title { font-size: 7.5pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: #374151; margin-bottom: 6px; }
.direction-badge { display: inline-block; padding: 4px 14px; border-radius: 20px; font-size: 8pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
.export-badge { background: #dbeafe; color: #1d4ed8; }
.import-badge { background: #fef3c7; color: #92400e; }
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
        <div class="company-sub">{{ $company['address'] ?? '' }}</div>
    </div>
    <div class="header-right">
        <div class="doc-label">Customs Declaration</div>
        <div class="doc-number">{{ $document->document_number }}</div>
    </div>
</div>
<div class="accent-bar"></div>

<div class="body">

    <!-- Direction + key fields -->
    <div class="row" style="margin-bottom:14px;">
        <div class="col-3">
            <div class="field-label">Declaration Type</div>
            <div style="margin-top:4px;">
                <span class="direction-badge {{ $document->trade_direction === 'export' ? 'export-badge' : 'import-badge' }}">
                    {{ strtoupper($document->trade_direction) }} DECLARATION
                </span>
            </div>
        </div>
        <div class="col-3">
            <div class="field-label">Route</div>
            <div class="field-value" style="font-size:11pt;">{{ $document->origin_country }} → {{ $document->destination_country }}</div>
        </div>
        <div class="col-3">
            <div class="field-label">Departure Date</div>
            <div class="field-value">{{ $document->departure_date?->format('d M Y') ?? '—' }}</div>
        </div>
    </div>

    <!-- Transport -->
    <div class="section-title">Transport Details</div>
    <div class="row">
        <div class="col-3">
            <div class="field-label">Mode of Transport</div>
            <div class="field-value">{{ ucfirst($document->transport_mode ?? '—') }}</div>
        </div>
        <div class="col-3">
            <div class="field-label">Vehicle / Flight / Vessel Ref</div>
            <div class="field-value mono">{{ $document->vehicle_reg ?? '—' }}</div>
        </div>
        <div class="col-3">
            <div class="field-label">Border Post / Port of Entry</div>
            <div class="field-value">{{ $document->border_post ?? '—' }}</div>
        </div>
    </div>

    <!-- Exporter -->
    <div class="section-title">Exporter / Consignor</div>
    <div class="row">
        <div class="col-l">
            <div class="field-label">Name &amp; Address</div>
            <div class="field-value">{{ $document->exporter_name }}</div>
            <div style="margin-top:3px; font-size:8.5pt;">{{ nl2br(e($document->exporter_address)) }}</div>
        </div>
        <div class="col-r">
            <div class="field-label">KRA PIN / Tax Registration</div>
            <div class="field-value mono">{{ $document->exporter_kra_pin ?? '—' }}</div>
        </div>
    </div>

    <!-- Importer -->
    <div class="section-title">Importer / Consignee</div>
    <div class="row">
        <div class="col-l">
            <div class="field-label">Name &amp; Address</div>
            <div class="field-value">{{ $document->importer_name }}</div>
            <div style="margin-top:3px; font-size:8.5pt;">{{ nl2br(e($document->importer_address)) }}</div>
        </div>
        <div class="col-r">
            <div class="field-label">Foreign Tax ID</div>
            <div class="field-value mono">{{ $document->importer_tax_id ?? '—' }}</div>
        </div>
    </div>

    <!-- Goods -->
    <div class="section-title">Goods Declaration</div>
    <table>
        <thead>
            <tr>
                <th width="4%">#</th>
                <th width="28%">Description of Goods</th>
                <th width="12%">HS Tariff Code</th>
                <th class="text-right" width="10%">Qty</th>
                <th width="8%">Unit</th>
                <th class="text-right" width="10%">Gross (kg)</th>
                <th class="text-right" width="10%">Net (kg)</th>
                <th class="text-right" width="14%">Customs Value ({{ $document->currency }})</th>
            </tr>
        </thead>
        <tbody>
            @foreach($document->items ?? [] as $i => $item)
            <tr>
                <td class="text-center">{{ $i + 1 }}</td>
                <td>{{ $item['description'] ?? '' }}</td>
                <td class="mono text-center">{{ $item['hs_code'] ?? '—' }}</td>
                <td class="text-right">{{ number_format($item['quantity'] ?? 0, 2) }}</td>
                <td>{{ $item['unit'] ?? '' }}</td>
                <td class="text-right">{{ number_format($item['gross_weight'] ?? 0, 3) }}</td>
                <td class="text-right">{{ number_format($item['net_weight'] ?? 0, 3) }}</td>
                <td class="text-right">{{ number_format($item['value'] ?? 0, 2) }}</td>
            </tr>
            @endforeach
        </tbody>
        <tfoot>
            <tr>
                <td colspan="5" style="text-align:right; font-weight:bold; font-size:8pt;">TOTALS</td>
                <td class="text-right" style="font-weight:bold;">{{ number_format($document->total_gross_weight ?? 0, 3) }}</td>
                <td class="text-right" style="font-weight:bold;">{{ number_format($document->total_net_weight ?? 0, 3) }}</td>
                <td class="text-right" style="font-weight:bold;">{{ $document->currency }} {{ number_format($document->total_value, 2) }}</td>
            </tr>
        </tfoot>
    </table>

    <!-- Totals summary box -->
    <div class="box" style="margin-top:14px;">
        <div class="box-title">Customs Summary</div>
        <div class="row">
            <div class="col-3">
                <div class="field-label">Total Declared Value</div>
                <div class="field-value">{{ $document->currency }} {{ number_format($document->total_value, 2) }}</div>
            </div>
            <div class="col-3">
                <div class="field-label">Total Gross Weight</div>
                <div class="field-value">{{ number_format($document->total_gross_weight ?? 0, 3) }} kg</div>
            </div>
            <div class="col-3">
                <div class="field-label">Incoterms / Terms of Delivery</div>
                <div class="field-value">{{ $document->notes ? substr($document->notes, 0, 40) : '—' }}</div>
            </div>
        </div>
    </div>

    @if($document->notes)
    <div style="margin-top:12px; padding:10px; background:#f9fafb; border-radius:4px; font-size:8.5pt;">
        <strong>Additional Notes:</strong> {{ $document->notes }}
    </div>
    @endif

    <!-- Signature -->
    <div style="margin-top:16px; padding:10px; background:#fef3c7; border-radius:4px; font-size:8pt; color:#78350f;">
        <strong>DECLARATION:</strong> I, the undersigned, declare that the information above is true and correct and
        that the goods declared comply with all applicable customs regulations of the origin and destination countries.
        I understand that a false declaration is a criminal offence liable to prosecution.
    </div>

    <div class="sig-table">
        <div class="sig-cell">
            <div style="height:40px;"></div>
            <div class="sig-line">Declarant Signature</div>
        </div>
        <div class="sig-cell">
            <div style="height:40px;"></div>
            <div class="sig-line">Name &amp; Title</div>
        </div>
        <div class="sig-cell">
            <div style="height:40px;"></div>
            <div class="sig-line">Date</div>
        </div>
    </div>

    <div style="margin-top:16px; border:1px solid #e5e7eb; border-radius:4px; padding:12px; background:#f9fafb;">
        <div class="box-title">For Official Use — Customs Authority</div>
        <div class="row">
            <div class="col-3">
                <div class="field-label">Registration No.</div>
                <div style="height:20px; border-bottom:1px solid #d1d5db;"></div>
            </div>
            <div class="col-3">
                <div class="field-label">Cleared by</div>
                <div style="height:20px; border-bottom:1px solid #d1d5db;"></div>
            </div>
            <div class="col-3">
                <div class="field-label">Date Cleared</div>
                <div style="height:20px; border-bottom:1px solid #d1d5db;"></div>
            </div>
        </div>
    </div>
</div>

<div class="footer">
    {{ $document->document_number }} · {{ ucfirst($document->trade_direction) }} Declaration · Generated {{ now()->format('d M Y H:i') }}
</div>
</body>
</html>
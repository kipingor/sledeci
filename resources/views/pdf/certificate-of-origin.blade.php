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
.company-name { font-size: 17pt; font-weight: bold; color: #F59E0B; letter-spacing: 0.3px; }
.company-sub  { font-size: 7.5pt; color: #9ca3af; margin-top: 2px; }
.doc-label    { font-size: 9pt; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.8px; }
.doc-number   { font-size: 15pt; font-weight: bold; color: #fff; margin-top: 3px; font-family: monospace; }

.accent-bar   { background: #F59E0B; height: 4px; width: 100%; }

.body { padding: 24px 30px; }

/* EAC/COMESA badge */
.region-badge {
    display: inline-block;
    background: #065f46;
    color: #fff;
    padding: 3px 10px;
    border-radius: 20px;
    font-size: 7.5pt;
    font-weight: bold;
    letter-spacing: 0.5px;
    margin-bottom: 14px;
}

/* Section title */
.section-title {
    font-size: 7pt;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: #6b7280;
    border-bottom: 1px solid #e5e7eb;
    padding-bottom: 4px;
    margin: 14px 0 8px;
}

/* Two-column layout */
.row   { display: table; width: 100%; margin-bottom: 10px; }
.col-l { display: table-cell; width: 50%; vertical-align: top; padding-right: 12px; }
.col-r { display: table-cell; width: 50%; vertical-align: top; padding-left: 12px; }

.field-label { font-size: 7.5pt; color: #9ca3af; margin-bottom: 2px; }
.field-value { font-size: 9.5pt; font-weight: bold; }

/* Goods table */
table { width: 100%; border-collapse: collapse; margin-top: 6px; }
th { background: #111827; color: #fff; font-size: 7.5pt; text-transform: uppercase; letter-spacing: 0.5px; padding: 5px 8px; text-align: left; }
td { font-size: 8.5pt; padding: 5px 8px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
tr:nth-child(even) td { background: #f9fafb; }
.text-right { text-align: right; }
.font-mono  { font-family: monospace; }

/* Certification box */
.cert-box {
    border: 1px solid #d1fae5;
    background: #f0fdf4;
    border-radius: 6px;
    padding: 14px;
    margin-top: 16px;
}
.cert-title { font-size: 10pt; font-weight: bold; color: #065f46; margin-bottom: 8px; }

/* Declaration */
.declaration {
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    padding: 12px;
    margin-top: 14px;
    font-size: 8.5pt;
    color: #374151;
    line-height: 1.5;
}

/* Signature area */
.sig-table { display: table; width: 100%; margin-top: 24px; }
.sig-cell  { display: table-cell; width: 33%; vertical-align: bottom; padding-right: 16px; }
.sig-line  { border-top: 1px solid #374151; padding-top: 6px; font-size: 8pt; }

.footer { background: #111827; color: #6b7280; text-align: center; padding: 10px; font-size: 7.5pt; margin-top: 30px; }
</style>
</head>
<body>

<!-- Header -->
<div class="header">
    <div class="header-left">
        <div class="company-name">{{ $company['name'] ?? 'Company Name' }}</div>
        <div class="company-sub">{{ $company['address'] ?? '' }}</div>
    </div>
    <div class="header-right">
        <div class="doc-label">Certificate of Origin</div>
        <div class="doc-number">{{ $document->document_number }}</div>
    </div>
</div>
<div class="accent-bar"></div>

<div class="body">

    @if($document->origin_region)
    <div>
        <span class="region-badge">{{ $document->origin_region }} PREFERENTIAL CERTIFICATE</span>
    </div>
    @endif

    <!-- Route summary -->
    <div class="row">
        <div class="col-l">
            <div class="field-label">Origin Country</div>
            <div class="field-value">{{ $document->origin_country }}</div>
        </div>
        <div class="col-r">
            <div class="field-label">Destination Country</div>
            <div class="field-value">{{ $document->destination_country }}</div>
        </div>
    </div>

    <div class="row">
        <div class="col-l">
            <div class="field-label">Transport Mode</div>
            <div class="field-value">{{ ucfirst($document->transport_mode ?? '—') }}</div>
        </div>
        <div class="col-r">
            <div class="field-label">Departure Date</div>
            <div class="field-value">{{ $document->departure_date?->format('d M Y') ?? '—' }}</div>
        </div>
    </div>

    @if($document->vehicle_reg || $document->border_post)
    <div class="row">
        <div class="col-l">
            <div class="field-label">Vehicle Registration</div>
            <div class="field-value font-mono">{{ $document->vehicle_reg ?? '—' }}</div>
        </div>
        <div class="col-r">
            <div class="field-label">Border Post</div>
            <div class="field-value">{{ $document->border_post ?? '—' }}</div>
        </div>
    </div>
    @endif

    <!-- Exporter -->
    <div class="section-title">Exporter (Seller / Consignor)</div>
    <div class="row">
        <div class="col-l">
            <div class="field-label">Name</div>
            <div class="field-value">{{ $document->exporter_name }}</div>
            <div style="margin-top:4px; font-size:8.5pt; color:#374151;">{{ nl2br(e($document->exporter_address)) }}</div>
        </div>
        <div class="col-r">
            <div class="field-label">KRA PIN</div>
            <div class="field-value font-mono">{{ $document->exporter_kra_pin ?? '—' }}</div>
        </div>
    </div>

    <!-- Importer -->
    <div class="section-title">Importer (Buyer / Consignee)</div>
    <div class="row">
        <div class="col-l">
            <div class="field-label">Name</div>
            <div class="field-value">{{ $document->importer_name }}</div>
            <div style="margin-top:4px; font-size:8.5pt; color:#374151;">{{ nl2br(e($document->importer_address)) }}</div>
        </div>
        <div class="col-r">
            <div class="field-label">Tax ID</div>
            <div class="field-value font-mono">{{ $document->importer_tax_id ?? '—' }}</div>
        </div>
    </div>

    <!-- Goods declaration -->
    <div class="section-title">Description of Goods</div>
    <table>
        <thead>
            <tr>
                <th>#</th>
                <th>Description</th>
                <th>HS Code</th>
                <th class="text-right">Quantity</th>
                <th class="text-right">Gross Wt (kg)</th>
                <th class="text-right">Net Wt (kg)</th>
                <th class="text-right">Value ({{ $document->currency }})</th>
            </tr>
        </thead>
        <tbody>
            @foreach($document->items ?? [] as $i => $item)
            <tr>
                <td>{{ $i + 1 }}</td>
                <td>{{ $item['description'] ?? '' }}</td>
                <td class="font-mono">{{ $item['hs_code'] ?? '—' }}</td>
                <td class="text-right">{{ number_format($item['quantity'] ?? 0, 2) }} {{ $item['unit'] ?? '' }}</td>
                <td class="text-right">{{ number_format($item['gross_weight'] ?? 0, 3) }}</td>
                <td class="text-right">{{ number_format($item['net_weight'] ?? 0, 3) }}</td>
                <td class="text-right">{{ number_format($item['value'] ?? 0, 2) }}</td>
            </tr>
            @endforeach
        </tbody>
        <tfoot>
            <tr>
                <td colspan="4" style="text-align:right; font-weight:bold; background:#f9fafb;">Totals</td>
                <td class="text-right" style="font-weight:bold; background:#f9fafb;">{{ number_format($document->total_gross_weight ?? 0, 3) }}</td>
                <td class="text-right" style="font-weight:bold; background:#f9fafb;">{{ number_format($document->total_net_weight ?? 0, 3) }}</td>
                <td class="text-right" style="font-weight:bold; background:#f9fafb;">{{ number_format($document->total_value, 2) }}</td>
            </tr>
        </tfoot>
    </table>

    <!-- Declaration -->
    <div class="declaration">
        <strong>DECLARATION BY THE EXPORTER:</strong><br>
        The undersigned hereby declares that the above details are correct, that the goods described above originated in
        <strong>{{ $document->origin_country }}</strong>
        @if($document->origin_region)
        and qualify for preferential tariff treatment under the <strong>{{ $document->origin_region }}</strong> treaty
        @endif
        , and that the information and documents submitted are true and accurate.
    </div>

    <!-- Certification -->
    @if($document->status === 'certified' && $document->certifying_authority)
    <div class="cert-box">
        <div class="cert-title">✓ Certified by {{ $document->certifying_authority }}</div>
        <div class="row">
            <div class="col-l">
                <div class="field-label">Certificate Reference</div>
                <div class="field-value font-mono">{{ $document->certificate_reference }}</div>
            </div>
            <div class="col-r">
                <div class="field-label">Date Certified</div>
                <div class="field-value">{{ $document->certified_date?->format('d M Y') }}</div>
            </div>
        </div>
        @if($document->valid_until)
        <div style="margin-top:6px;">
            <div class="field-label">Valid Until</div>
            <div class="field-value">{{ $document->valid_until->format('d M Y') }}</div>
        </div>
        @endif
    </div>
    @endif

    <!-- Signature lines -->
    <div class="sig-table">
        <div class="sig-cell">
            <div style="height:40px;"></div>
            <div class="sig-line">Exporter Signature &amp; Stamp</div>
        </div>
        <div class="sig-cell">
            <div style="height:40px;"></div>
            <div class="sig-line">Date</div>
        </div>
        <div class="sig-cell">
            <div style="height:40px;"></div>
            <div class="sig-line">Certifying Authority Stamp</div>
        </div>
    </div>

    @if($document->notes)
    <div style="margin-top:16px; padding:10px; background:#f9fafb; border-radius:4px; font-size:8.5pt; color:#374151;">
        <strong>Notes:</strong> {{ $document->notes }}
    </div>
    @endif
</div>

<div class="footer">
    {{ $document->document_number }} · Generated {{ now()->format('d M Y H:i') }} · {{ $company['name'] ?? '' }}
</div>
</body>
</html>
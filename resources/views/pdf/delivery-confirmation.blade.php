<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
        font-family: 'DejaVu Sans', Arial, sans-serif;
        font-size: 10pt;
        color: #1a1a2e;
        background: #fff;
    }

    /* ── Header / Branding ── */
    .header {
        background: #111827;
        color: #fff;
        padding: 20px 30px;
        display: table;
        width: 100%;
    }
    .header-left  { display: table-cell; vertical-align: middle; width: 60%; }
    .header-right { display: table-cell; vertical-align: middle; text-align: right; }
    .company-name {
        font-size: 18pt;
        font-weight: bold;
        color: #F59E0B;
        letter-spacing: 0.5px;
    }
    .company-sub  { font-size: 8pt; color: #9ca3af; margin-top: 2px; }
    .doc-title    { font-size: 13pt; font-weight: bold; color: #fff; }
    .doc-number   { font-size: 9pt; color: #F59E0B; margin-top: 4px; }

    /* ── Amber accent bar ── */
    .accent-bar {
        background: #F59E0B;
        height: 4px;
        width: 100%;
    }

    .body { padding: 24px 30px; }

    /* ── Status badge ── */
    .status-badge {
        display: inline-block;
        padding: 3px 10px;
        border-radius: 20px;
        font-size: 8pt;
        font-weight: bold;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    .status-pending    { background: #f1f5f9; color: #475569; }
    .status-in_transit { background: #dbeafe; color: #1d4ed8; }
    .status-delivered  { background: #d1fae5; color: #065f46; }
    .status-rejected   { background: #fee2e2; color: #991b1b; }

    /* ── Two-column grid ── */
    .row { display: table; width: 100%; margin-bottom: 16px; }
    .col { display: table-cell; vertical-align: top; padding-right: 12px; }
    .col:last-child { padding-right: 0; }
    .col-half { width: 50%; }

    /* ── Card sections ── */
    .card {
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        margin-bottom: 16px;
        overflow: hidden;
    }
    .card-header {
        background: #f9fafb;
        border-bottom: 1px solid #e5e7eb;
        padding: 7px 12px;
        font-size: 8pt;
        font-weight: bold;
        text-transform: uppercase;
        letter-spacing: 0.6px;
        color: #6b7280;
    }
    .card-body { padding: 12px; }

    .field { margin-bottom: 8px; }
    .field-label {
        font-size: 7.5pt;
        text-transform: uppercase;
        letter-spacing: 0.4px;
        color: #9ca3af;
        margin-bottom: 2px;
    }
    .field-value {
        font-size: 9.5pt;
        color: #111827;
        font-weight: 500;
    }
    .field-value.light { font-weight: normal; color: #374151; }

    /* ── Items table ── */
    table.items {
        width: 100%;
        border-collapse: collapse;
        font-size: 9pt;
    }
    table.items thead tr {
        background: #111827;
        color: #fff;
    }
    table.items thead th {
        padding: 7px 10px;
        text-align: left;
        font-size: 8pt;
        text-transform: uppercase;
        letter-spacing: 0.4px;
    }
    table.items tbody tr:nth-child(even) { background: #f9fafb; }
    table.items tbody td { padding: 7px 10px; border-bottom: 1px solid #e5e7eb; }
    table.items tfoot tr { background: #fef3c7; }
    table.items tfoot td {
        padding: 7px 10px;
        font-weight: bold;
        border-top: 2px solid #F59E0B;
    }

    /* ── Signature block ── */
    .sig-block {
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        padding: 16px;
        margin-top: 8px;
    }
    .sig-row { display: table; width: 100%; }
    .sig-col  { display: table-cell; vertical-align: bottom; padding-right: 20px; }
    .sig-col:last-child { padding-right: 0; }
    .sig-line {
        border-bottom: 1.5px solid #374151;
        margin-top: 40px;
        margin-bottom: 4px;
    }
    .sig-label { font-size: 8pt; color: #6b7280; }

    /* ── Declaration box ── */
    .declaration {
        background: #fffbeb;
        border: 1px solid #fcd34d;
        border-radius: 6px;
        padding: 10px 14px;
        font-size: 9pt;
        color: #92400e;
        margin-bottom: 16px;
    }

    /* ── QR / confirmation link ── */
    .confirm-box {
        background: #f0fdf4;
        border: 1px solid #bbf7d0;
        border-radius: 6px;
        padding: 10px 14px;
        font-size: 8.5pt;
        color: #166534;
        margin-bottom: 16px;
        text-align: center;
    }
    .confirm-url {
        font-family: monospace;
        font-size: 8pt;
        word-break: break-all;
        color: #15803d;
        margin-top: 4px;
    }

    /* ── Footer ── */
    .footer {
        margin-top: 24px;
        border-top: 1px solid #e5e7eb;
        padding-top: 10px;
        font-size: 7.5pt;
        color: #9ca3af;
        text-align: center;
    }
</style>
</head>
<body>

    {{-- ── Header ── --}}
    <div class="header">
        <div class="header-left">
            <div class="company-name">{{ $company['name'] }}</div>
            <div class="company-sub">{{ $company['address'] }}</div>
            @if($company['email'])
            <div class="company-sub">{{ $company['email'] }}  ·  {{ $company['phone'] }}</div>
            @endif
        </div>
        <div class="header-right">
            <div class="doc-title">Delivery Confirmation</div>
            <div class="doc-number">#{{ $delivery->number }}</div>
            <div style="margin-top:6px">
                <span class="status-badge status-{{ $delivery->status }}">
                    {{ strtoupper(str_replace('_', ' ', $delivery->status)) }}
                </span>
            </div>
        </div>
    </div>
    <div class="accent-bar"></div>

    <div class="body">

        {{-- ── Meta row ── --}}
        <div class="row" style="margin-bottom:16px">
            <div class="col col-half">
                <div class="field">
                    <div class="field-label">Document Date</div>
                    <div class="field-value">{{ now()->format('d F Y') }}</div>
                </div>
                <div class="field">
                    <div class="field-label">Purchase Order</div>
                    <div class="field-value">#{{ $delivery->purchaseOrder->number ?? '—' }}</div>
                </div>
                @if($delivery->tracking_number)
                <div class="field">
                    <div class="field-label">Tracking Number</div>
                    <div class="field-value light">{{ $delivery->tracking_number }}</div>
                </div>
                @endif
            </div>
            <div class="col col-half">
                <div class="field">
                    <div class="field-label">Expected Date</div>
                    <div class="field-value">
                        {{ $delivery->expected_date ? $delivery->expected_date->format('d F Y') : '—' }}
                    </div>
                </div>
                @if($delivery->delivered_date)
                <div class="field">
                    <div class="field-label">Delivery Date</div>
                    <div class="field-value">{{ $delivery->delivered_date->format('d F Y') }}</div>
                </div>
                @endif
            </div>
        </div>

        {{-- ── Supplier & Client ── --}}
        <div class="row">
            <div class="col col-half">
                <div class="card">
                    <div class="card-header">Supplier</div>
                    <div class="card-body">
                        <div class="field">
                            <div class="field-value">{{ $delivery->purchaseOrder->supplier->name ?? '—' }}</div>
                        </div>
                        @if($delivery->purchaseOrder->supplier->email ?? false)
                        <div class="field">
                            <div class="field-label">Email</div>
                            <div class="field-value light">{{ $delivery->purchaseOrder->supplier->email }}</div>
                        </div>
                        @endif
                        @if($delivery->purchaseOrder->supplier->phone ?? false)
                        <div class="field">
                            <div class="field-label">Phone</div>
                            <div class="field-value light">{{ $delivery->purchaseOrder->supplier->phone }}</div>
                        </div>
                        @endif
                    </div>
                </div>
            </div>
            <div class="col col-half">
                <div class="card">
                    <div class="card-header">Delivered To</div>
                    <div class="card-body">
                        <div class="field">
                            <div class="field-value">
                                {{ $delivery->client->company ?? $delivery->client->name ?? '—' }}
                            </div>
                        </div>
                        @if($delivery->client->address ?? false)
                        <div class="field">
                            <div class="field-label">Address</div>
                            <div class="field-value light">{{ $delivery->client->address }}</div>
                        </div>
                        @endif
                        @if($delivery->client->email ?? false)
                        <div class="field">
                            <div class="field-label">Email</div>
                            <div class="field-value light">{{ $delivery->client->email }}</div>
                        </div>
                        @endif
                    </div>
                </div>
            </div>
        </div>

        {{-- ── Items delivered ── --}}
        @php $items = collect($delivery->items)->reject(fn($v, $k) => str_starts_with((string)$k, '_'))->values(); @endphp
        @if($items->count())
        <div class="card">
            <div class="card-header">Items Delivered</div>
            <div class="card-body" style="padding:0">
                <table class="items">
                    <thead>
                        <tr>
                            <th style="width:40%">Description</th>
                            <th>SKU / Code</th>
                            <th style="text-align:right">Qty Ordered</th>
                            <th style="text-align:right">Qty Delivered</th>
                            <th>Condition</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach($items as $item)
                        <tr>
                            <td>{{ $item['name'] ?? $item['description'] ?? '—' }}</td>
                            <td>{{ $item['sku'] ?? '—' }}</td>
                            <td style="text-align:right">{{ $item['qty_ordered'] ?? $item['quantity'] ?? '—' }}</td>
                            <td style="text-align:right">{{ $item['qty_delivered'] ?? $item['quantity'] ?? '—' }}</td>
                            <td>{{ $item['condition'] ?? 'Good' }}</td>
                        </tr>
                        @endforeach
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="3">Total Items</td>
                            <td style="text-align:right">{{ $items->count() }}</td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
        @else
        <div class="card">
            <div class="card-header">Items Delivered</div>
            <div class="card-body">
                <p style="color:#6b7280;font-size:9pt">All items as per purchase order #{{ $delivery->purchaseOrder->number ?? '' }}.</p>
            </div>
        </div>
        @endif

        @if($delivery->delivery_notes)
        <div class="card">
            <div class="card-header">Delivery Notes</div>
            <div class="card-body">
                <p style="font-size:9pt;color:#374151">{{ $delivery->delivery_notes }}</p>
            </div>
        </div>
        @endif

        {{-- ── Digital confirmation link ── --}}
        @if($confirmUrl)
        <div class="confirm-box">
            <strong>Digital Confirmation Available</strong><br>
            The recipient can also confirm delivery digitally by visiting the link below:
            <div class="confirm-url">{{ $confirmUrl }}</div>
        </div>
        @endif

        {{-- ── Declaration ── --}}
        <div class="declaration">
            <strong>Confirmation of Receipt</strong><br>
            By signing below, the recipient confirms that the goods listed above have been received in
            the stated condition and quantities, and that this delivery is complete and satisfactory
            unless otherwise noted.
        </div>

        {{-- ── Signature block ── --}}
        <div class="sig-block">
            <div class="sig-row">
                <div class="sig-col" style="width:40%">
                    <div class="sig-line"></div>
                    <div class="sig-label">Received by (Print Name)</div>
                </div>
                <div class="sig-col" style="width:35%">
                    <div class="sig-line"></div>
                    <div class="sig-label">Signature</div>
                </div>
                <div class="sig-col" style="width:25%">
                    <div class="sig-line"></div>
                    <div class="sig-label">Date</div>
                </div>
            </div>
            <div class="sig-row" style="margin-top:24px">
                <div class="sig-col" style="width:40%">
                    <div class="sig-line"></div>
                    <div class="sig-label">Delivered by (Print Name)</div>
                </div>
                <div class="sig-col" style="width:35%">
                    <div class="sig-line"></div>
                    <div class="sig-label">Signature</div>
                </div>
                <div class="sig-col" style="width:25%">
                    <div class="sig-line"></div>
                    <div class="sig-label">Date</div>
                </div>
            </div>
        </div>

        {{-- ── Footer ── --}}
        <div class="footer">
            This document was generated by {{ $company['name'] }} · {{ now()->format('d F Y, H:i') }} ·
            Delivery ref: {{ $delivery->number }}
        </div>

    </div>
</body>
</html>
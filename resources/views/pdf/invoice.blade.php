<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }

body {
    font-family: 'DejaVu Sans', Arial, sans-serif;
    font-size: 9.5pt;
    color: #1a1a2e;
    background: #fff;
}

/* ── Header ── */
.header {
    background: {{ $company['brand_dark'] ?? '#111827' }};
    color: #fff;
    padding: 22px 30px;
    display: table;
    width: 100%;
}
.header-left  { display: table-cell; vertical-align: middle; width: 55%; }
.header-right { display: table-cell; vertical-align: top;    text-align: right; }

.company-name { font-size: 17pt; font-weight: bold; color: {{ $company['brand_color'] ?? '#F59E0B' }}; letter-spacing: 0.3px; }
.company-sub  { font-size: 7.5pt; color: #9ca3af; margin-top: 2px; }

.doc-label  { font-size: 9pt; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.8px; }
.doc-number { font-size: 16pt; font-weight: bold; color: #fff; margin-top: 3px; font-family: monospace; }
.doc-status {
    display: inline-block;
    margin-top: 6px;
    padding: 3px 10px;
    border-radius: 20px;
    font-size: 7.5pt;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}
.status-draft     { background: #f1f5f9; color: #475569; }
.status-issued    { background: #dbeafe; color: #1d4ed8; }
.status-paid      { background: #d1fae5; color: #065f46; }
.status-overdue   { background: #fee2e2; color: #991b1b; }
.status-cancelled { background: #f4f4f5; color: #71717a; }

.accent-bar { background: {{ $company['brand_color'] ?? '#F59E0B' }}; height: 4px; width: 100%; }

/* ── Body ── */
.body { padding: 20px 30px; }

/* ── Row / Col ── */
.row { display: table; width: 100%; margin-bottom: 16px; }
.col { display: table-cell; vertical-align: top; }
.col-half { width: 50%; padding-right: 12px; }
.col-half:last-child { padding-right: 0; }
.col-third { width: 33.333%; padding-right: 10px; }
.col-third:last-child { padding-right: 0; }

/* ── Cards ── */
.card { border: 1px solid #e5e7eb; border-radius: 5px; margin-bottom: 14px; overflow: hidden; }
.card-header {
    background: #f9fafb;
    border-bottom: 1px solid #e5e7eb;
    padding: 6px 12px;
    font-size: 7.5pt;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #6b7280;
}
.card-body { padding: 10px 12px; }

.field { margin-bottom: 7px; }
.field-label { font-size: 7pt; text-transform: uppercase; letter-spacing: 0.4px; color: #9ca3af; margin-bottom: 1px; }
.field-value { font-size: 9pt; color: #111827; font-weight: 500; }
.field-value.light { font-weight: normal; color: #374151; }

/* ── Date row ── */
.dates-row { display: table; width: 100%; margin-bottom: 14px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 5px; }
.date-cell { display: table-cell; padding: 10px 14px; vertical-align: top; border-right: 1px solid #e5e7eb; }
.date-cell:last-child { border-right: none; }

/* ── Line items table ── */
table.lines { width: 100%; border-collapse: collapse; font-size: 9pt; }
table.lines thead tr { background: {{ $company['brand_dark'] ?? '#111827' }}; color: #fff; }
table.lines thead th { padding: 7px 10px; text-align: left; font-size: 7.5pt; text-transform: uppercase; letter-spacing: 0.4px; font-weight: normal; }
table.lines tbody tr:nth-child(even) { background: #f9fafb; }
table.lines tbody td { padding: 7px 10px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
table.lines tbody tr:last-child td { border-bottom: none; }
.text-right { text-align: right; }

/* ── Totals ── */
.totals { width: 220px; margin-left: auto; margin-top: 4px; }
.totals-row { display: table; width: 100%; }
.totals-label { display: table-cell; padding: 4px 8px; font-size: 8.5pt; color: #6b7280; text-align: left; }
.totals-value { display: table-cell; padding: 4px 8px; font-size: 8.5pt; font-weight: 500; text-align: right; width: 90px; }
.totals-divider { border-top: 1px solid #e5e7eb; margin: 4px 0; }
.totals-total .totals-label { font-size: 10pt; font-weight: bold; color: #111827; padding-top: 6px; }
.totals-total .totals-value { font-size: 10pt; font-weight: bold; color: #111827; padding-top: 6px; }

/* ── Payment details ── */
.pay-box { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 5px; padding: 10px 14px; margin-top: 14px; }
.pay-box-title { font-size: 8pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: #92400e; margin-bottom: 8px; }
.pay-grid { display: table; width: 100%; }
.pay-col   { display: table-cell; vertical-align: top; width: 50%; padding-right: 10px; }
.pay-col:last-child { padding-right: 0; }
.pay-field { margin-bottom: 5px; font-size: 8.5pt; }
.pay-field span:first-child { color: #92400e; font-size: 7.5pt; display: block; }
.pay-field span:last-child  { color: #78350f; font-weight: 500; }

/* ── Notes ── */
.notes { font-size: 8.5pt; color: #374151; font-style: italic; margin-top: 10px; padding: 8px 12px; background: #f9fafb; border-radius: 5px; border-left: 3px solid #e5e7eb; }

/* ── Footer ── */
.footer { margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 10px; font-size: 7.5pt; color: #9ca3af; text-align: center; }

/* ── Tax box ── */
.tax-notice { font-size: 7.5pt; color: #6b7280; margin-top: 6px; text-align: right; }
</style>
</head>
<body>

{{-- ── Header ── --}}
<div class="header">
    <div class="header-left">
        <div class="company-name">{{ $company['name'] }}</div>
        @if(!empty($company['tagline']))
        <div class="company-sub">{{ $company['tagline'] }}</div>
        @endif
        <div class="company-sub">{{ $company['address'] }}{{ $company['city'] ? ', ' . $company['city'] : '' }}</div>
        @if(!empty($company['phone']))
        <div class="company-sub">{{ $company['phone'] }}{{ $company['email'] ? '  ·  ' . $company['email'] : '' }}</div>
        @endif
        @if(!empty($company['kra_pin']))
        <div class="company-sub" style="margin-top:4px;color:#fcd34d;">KRA PIN: {{ $company['kra_pin'] }}{{ !empty($company['vat_number']) && $company['vat_number'] !== $company['kra_pin'] ? '  ·  VAT: ' . $company['vat_number'] : '' }}</div>
        @endif
    </div>
    <div class="header-right">
        <div class="doc-label">Tax Invoice</div>
        <div class="doc-number">{{ $invoice->number }}</div>
        <div>
            <span class="doc-status status-{{ $invoice->status }}">
                {{ strtoupper($invoice->status) }}
            </span>
        </div>
    </div>
</div>
<div class="accent-bar"></div>

<div class="body">

    {{-- ── Dates row ── --}}
    <div class="dates-row">
        <div class="date-cell">
            <div class="field-label">Issue Date</div>
            <div class="field-value">{{ $invoice->issue_date->format('d F Y') }}</div>
        </div>
        <div class="date-cell">
            <div class="field-label">Due Date</div>
            <div class="field-value" style="{{ $invoice->isOverdue() ? 'color:#dc2626;font-weight:bold' : '' }}">
                {{ $invoice->due_date->format('d F Y') }}
                @if($invoice->isOverdue()) &nbsp;<span style="font-size:7.5pt">(OVERDUE)</span>@endif
            </div>
        </div>
        <div class="date-cell">
            <div class="field-label">Currency</div>
            <div class="field-value">{{ $invoice->currency }}</div>
        </div>
        <div class="date-cell">
            <div class="field-label">Payment Terms</div>
            <div class="field-value">{{ $company['payment_terms'] ?? 'Net 30' }}</div>
        </div>
        @if(!empty($company['vat_number']) && ($company['vat_registered'] ?? false))
        <div class="date-cell">
            <div class="field-label">VAT Reg No.</div>
            <div class="field-value">{{ $company['vat_number'] }}</div>
        </div>
        @endif
    </div>

    {{-- ── Billed to / From ── --}}
    <div class="row">
        <div class="col col-half">
            <div class="card">
                <div class="card-header">Billed To</div>
                <div class="card-body">
                    @if($invoice->client)
                    <div class="field">
                        <div class="field-value">{{ $invoice->client->company ?? $invoice->client->name }}</div>
                        @if($invoice->client->company)
                        <div class="field-value light">{{ $invoice->client->name }}</div>
                        @endif
                    </div>
                    @if($invoice->client->address ?? false)
                    <div class="field">
                        <div class="field-label">Address</div>
                        <div class="field-value light">{{ $invoice->client->address }}</div>
                    </div>
                    @endif
                    @if($invoice->client->email ?? false)
                    <div class="field">
                        <div class="field-label">Email</div>
                        <div class="field-value light">{{ $invoice->client->email }}</div>
                    </div>
                    @endif
                    @if($invoice->client->phone ?? false)
                    <div class="field">
                        <div class="field-label">Phone</div>
                        <div class="field-value light">{{ $invoice->client->phone }}</div>
                    </div>
                    @endif
                    @else
                    <div class="field-value light">—</div>
                    @endif
                </div>
            </div>
        </div>
        <div class="col col-half">
            <div class="card">
                <div class="card-header">Invoice From</div>
                <div class="card-body">
                    <div class="field"><div class="field-value">{{ $company['name'] }}</div></div>
                    @if(!empty($company['address']))
                    <div class="field">
                        <div class="field-label">Address</div>
                        <div class="field-value light">
                            {{ $company['address'] }}@if(!empty($company['po_box'])), {{ $company['po_box'] }}@endif<br>
                            {{ $company['city'] }}{{ !empty($company['postal_code']) ? ' ' . $company['postal_code'] : '' }}, {{ $company['country'] }}
                        </div>
                    </div>
                    @endif
                    @if(!empty($company['email']))
                    <div class="field"><div class="field-label">Email</div><div class="field-value light">{{ $company['email'] }}</div></div>
                    @endif
                    @if(!empty($company['phone']))
                    <div class="field"><div class="field-label">Phone</div><div class="field-value light">{{ $company['phone'] }}</div></div>
                    @endif
                    @if(!empty($company['business_reg']))
                    <div class="field"><div class="field-label">Reg No.</div><div class="field-value light">{{ $company['business_reg'] }}</div></div>
                    @endif
                </div>
            </div>
            @if($invoice->project)
            <div class="card" style="margin-top:8px">
                <div class="card-header">Project Reference</div>
                <div class="card-body">
                    <div class="field-value">{{ $invoice->project->name }}</div>
                </div>
            </div>
            @endif
        </div>
    </div>

    {{-- ── Line items ── --}}
    <div class="card">
        <div class="card-header">Invoice Lines</div>
        <div class="card-body" style="padding:0">
            <table class="lines">
                <thead>
                    <tr>
                        <th style="width:45%">Description</th>
                        <th style="width:12%;text-align:right">Qty</th>
                        <th style="width:18%;text-align:right">Unit Price</th>
                        <th style="width:15%;text-align:right">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($invoice->lines ?? [] as $line)
                    <tr>
                        <td>{{ $line['description'] }}</td>
                        <td class="text-right">{{ number_format((float)($line['quantity'] ?? 0), 2) }}</td>
                        <td class="text-right">{{ number_format((float)($line['unit_price'] ?? 0), 2) }}</td>
                        <td class="text-right">{{ number_format((float)($line['amount'] ?? 0), 2) }}</td>
                    </tr>
                    @endforeach
                </tbody>
            </table>
        </div>
    </div>

    {{-- ── Totals ── --}}
    <div class="totals">
        <div class="totals-row">
            <div class="totals-label">Subtotal</div>
            <div class="totals-value">{{ $invoice->currency }} {{ number_format((float)$invoice->subtotal, 2) }}</div>
        </div>
        @if((float)$invoice->tax > 0)
        <div class="totals-row">
            <div class="totals-label">
                VAT ({{ $company['vat_registered'] ? $company['default_vat_rate'] . '%' : '' }})
                @if(!empty($company['vat_number'])) <span style="font-size:7pt;color:#9ca3af">{{ $company['vat_number'] }}</span>@endif
            </div>
            <div class="totals-value">{{ $invoice->currency }} {{ number_format((float)$invoice->tax, 2) }}</div>
        </div>
        @endif
        <div class="totals-divider"></div>
        <div class="totals-row totals-total">
            <div class="totals-label">Total Due</div>
            <div class="totals-value">{{ $invoice->currency }} {{ number_format((float)$invoice->total, 2) }}</div>
        </div>
        @php $paid = $invoice->amountPaid(); $due = $invoice->amountDue(); @endphp
        @if($paid > 0)
        <div class="totals-row" style="margin-top:4px">
            <div class="totals-label" style="color:#065f46">Amount Paid</div>
            <div class="totals-value" style="color:#065f46">{{ $invoice->currency }} {{ number_format($paid, 2) }}</div>
        </div>
        <div class="totals-row">
            <div class="totals-label" style="color:{{ $due > 0 ? '#dc2626' : '#065f46' }};font-weight:bold">Balance Due</div>
            <div class="totals-value" style="color:{{ $due > 0 ? '#dc2626' : '#065f46' }};font-weight:bold">{{ $invoice->currency }} {{ number_format($due, 2) }}</div>
        </div>
        @endif
    </div>

    @if(($company['vat_registered'] ?? false) && !empty($company['kra_pin']))
    <div class="tax-notice">This is a tax invoice issued pursuant to the Value Added Tax Act (Cap. 476). KRA PIN: {{ $company['kra_pin'] }}</div>
    @endif

    {{-- ── Payment details ── --}}
    @if(!empty($company['bank_account_no']) || !empty($company['mpesa_paybill']))
    <div class="pay-box">
        <div class="pay-box-title">Payment Details</div>
        <div class="pay-grid">
            @if(!empty($company['bank_account_no']))
            <div class="pay-col">
                <div style="font-size:7.5pt;font-weight:bold;color:#92400e;margin-bottom:5px">Bank Transfer</div>
                @if(!empty($company['bank_name']))
                <div class="pay-field"><span>Bank</span><span>{{ $company['bank_name'] }}</span></div>
                @endif
                @if(!empty($company['bank_branch']))
                <div class="pay-field"><span>Branch</span><span>{{ $company['bank_branch'] }}</span></div>
                @endif
                <div class="pay-field"><span>Account Name</span><span>{{ $company['bank_account_name'] }}</span></div>
                <div class="pay-field"><span>Account No.</span><span>{{ $company['bank_account_no'] }}</span></div>
                @if(!empty($company['bank_swift']))
                <div class="pay-field"><span>SWIFT / BIC</span><span>{{ $company['bank_swift'] }}</span></div>
                @endif
            </div>
            @endif
            @if(!empty($company['mpesa_paybill']) || !empty($company['mpesa_till']))
            <div class="pay-col">
                <div style="font-size:7.5pt;font-weight:bold;color:#92400e;margin-bottom:5px">M-Pesa</div>
                @if(!empty($company['mpesa_paybill']))
                <div class="pay-field"><span>Paybill No.</span><span>{{ $company['mpesa_paybill'] }}</span></div>
                <div class="pay-field"><span>Account Ref.</span><span>{{ $company['mpesa_account'] ?? $invoice->number }}</span></div>
                @endif
                @if(!empty($company['mpesa_till']))
                <div class="pay-field"><span>Buy Goods Till</span><span>{{ $company['mpesa_till'] }}</span></div>
                @endif
                <div class="pay-field" style="margin-top:5px"><span style="font-style:italic">Use invoice number as reference</span></div>
            </div>
            @endif
        </div>
    </div>
    @endif

    {{-- ── Notes ── --}}
    @if($invoice->notes)
    <div class="notes">{{ $invoice->notes }}</div>
    @endif

    {{-- ── Footer ── --}}
    <div class="footer">
        {{ $company['invoice_footer'] ?? '' }}<br>
        {{ $company['name'] }}{{ !empty($company['website']) ? '  ·  ' . $company['website'] : '' }}  ·  Generated {{ now()->format('d F Y') }}
    </div>

</div>
</body>
</html>
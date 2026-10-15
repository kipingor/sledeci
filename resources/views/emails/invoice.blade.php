<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Invoice {{ $invoice->number }}</title>
<style>
  body { margin: 0; padding: 0; background: #f4f4f5; font-family: Arial, Helvetica, sans-serif; }
  .wrapper { max-width: 580px; margin: 32px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
  .header  { background: #111827; padding: 28px 32px; }
  .header h1 { margin: 0; color: #F59E0B; font-size: 20px; font-weight: bold; }
  .header p  { margin: 4px 0 0; color: #9ca3af; font-size: 13px; }
  .accent  { height: 4px; background: #F59E0B; }
  .body    { padding: 28px 32px; color: #374151; font-size: 14px; line-height: 1.6; }
  .summary { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px 20px; margin: 20px 0; }
  .summary table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .summary td { padding: 4px 0; }
  .summary td:last-child { text-align: right; font-weight: 600; }
  .summary .total td { font-size: 15px; font-weight: bold; border-top: 1px solid #e5e7eb; padding-top: 8px; margin-top: 4px; }
  .btn { display: inline-block; margin-top: 20px; padding: 12px 28px; background: #F59E0B; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; }
  .footer  { background: #f9fafb; border-top: 1px solid #e5e7eb; padding: 18px 32px; font-size: 12px; color: #9ca3af; }
  .footer a { color: #6b7280; }
</style>
</head>
<body>
<div class="wrapper">

  <div class="header">
    <h1>{{ $company['name'] }}</h1>
    <p>{{ $company['tagline'] ?? '' }}</p>
  </div>
  <div class="accent"></div>

  <div class="body">
    <p>Dear {{ $invoice->client->name ?? 'Valued Client' }},</p>

    @if(!empty($message))
    <p>{{ $message }}</p>
    @else
    <p>
      Please find attached your invoice <strong>{{ $invoice->number }}</strong>
      from {{ $company['name'] }}.
      The invoice is due on <strong>{{ $invoice->due_date->format('d F Y') }}</strong>.
    </p>
    @endif

    <div class="summary">
      <table>
        <tr>
          <td style="color:#6b7280">Invoice Number</td>
          <td>{{ $invoice->number }}</td>
        </tr>
        <tr>
          <td style="color:#6b7280">Issue Date</td>
          <td>{{ $invoice->issue_date->format('d F Y') }}</td>
        </tr>
        <tr>
          <td style="color:#6b7280">Due Date</td>
          <td>{{ $invoice->due_date->format('d F Y') }}</td>
        </tr>
        @if($invoice->project)
        <tr>
          <td style="color:#6b7280">Project</td>
          <td>{{ $invoice->project->name }}</td>
        </tr>
        @endif
        <tr>
          <td style="color:#6b7280">Subtotal</td>
          <td>{{ $invoice->currency }} {{ number_format((float)$invoice->subtotal, 2) }}</td>
        </tr>
        @if((float)$invoice->tax > 0)
        <tr>
          <td style="color:#6b7280">VAT</td>
          <td>{{ $invoice->currency }} {{ number_format((float)$invoice->tax, 2) }}</td>
        </tr>
        @endif
        <tr class="total">
          <td>Total Due</td>
          <td>{{ $invoice->currency }} {{ number_format((float)$invoice->total, 2) }}</td>
        </tr>
      </table>
    </div>

    @if(!empty($company['mpesa_paybill']))
    <p style="font-size:13px;color:#374151">
      <strong>M-Pesa Paybill:</strong> {{ $company['mpesa_paybill'] }} &nbsp;|&nbsp;
      <strong>Account:</strong> {{ $invoice->number }}
    </p>
    @endif
    @if(!empty($company['bank_account_no']))
    <p style="font-size:13px;color:#374151">
      <strong>Bank:</strong> {{ $company['bank_name'] ?? '' }} &nbsp;|&nbsp;
      <strong>Account:</strong> {{ $company['bank_account_no'] }}
    </p>
    @endif

    <p style="margin-top:20px;font-size:13px;color:#6b7280">
      The full invoice with payment details is attached as a PDF. If you have any questions,
      please don't hesitate to contact us at
      <a href="mailto:{{ $company['email'] }}" style="color:#F59E0B">{{ $company['email'] }}</a>.
    </p>

    <p>Thank you for your business.</p>

    <p style="margin-top:20px">
      <strong>{{ $company['name'] }}</strong><br>
      @if(!empty($company['phone']))<span style="color:#6b7280;font-size:13px">{{ $company['phone'] }}</span>@endif
    </p>
  </div>

  <div class="footer">
    <p>
      {{ $company['name'] }}
      @if(!empty($company['address'])) · {{ $company['address'] }}, {{ $company['city'] }}@endif
      @if(!empty($company['kra_pin'])) · KRA PIN: {{ $company['kra_pin'] }}@endif
    </p>
    @if(!empty($company['website']))
    <p><a href="{{ $company['website'] }}">{{ $company['website'] }}</a></p>
    @endif
    <p style="margin-top:8px">
      This email and its attachments are confidential and intended only for the named recipient.
    </p>
  </div>

</div>
</body>
</html>
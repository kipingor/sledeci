<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Proposal: {{ $proposal->title }}</title>
<style>
  body { margin: 0; padding: 0; background: #f4f4f5; font-family: Arial, Helvetica, sans-serif; }
  .wrapper { max-width: 580px; margin: 32px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
  .header  { background: #111827; padding: 28px 32px; }
  .header h1 { margin: 0; color: #F59E0B; font-size: 20px; font-weight: bold; }
  .header p  { margin: 4px 0 0; color: #9ca3af; font-size: 13px; }
  .accent  { height: 4px; background: #F59E0B; }
  .body    { padding: 28px 32px; color: #374151; font-size: 14px; line-height: 1.6; }
  .meta    { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 14px 18px; margin: 18px 0; font-size: 13px; }
  .meta p  { margin: 3px 0; }
  .meta span { color: #6b7280; display: inline-block; width: 100px; }
  .footer  { background: #f9fafb; border-top: 1px solid #e5e7eb; padding: 18px 32px; font-size: 12px; color: #9ca3af; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <h1>{{ $company['name'] }}</h1>
    <p>Proposal Submission</p>
  </div>
  <div class="accent"></div>
  <div class="body">
    <p>Dear {{ $proposal->lead?->title ?? $proposal->opportunity?->title ?? 'Valued Client' }},</p>

    @if(!empty($message))
    <p>{{ $message }}</p>
    @else
    <p>
      Please find attached our proposal: <strong>{{ $proposal->title }}</strong>.
      We look forward to the opportunity to work with you.
    </p>
    @endif

    <div class="meta">
      <p><span>Proposal</span> <strong>{{ $proposal->title }}</strong></p>
      <p><span>Date</span> {{ now()->format('d F Y') }}</p>
      @if($proposal->expires_at)
      <p><span>Valid Until</span> {{ $proposal->expires_at->format('d F Y') }}</p>
      @endif
      <p><span>Prepared by</span> {{ $company['name'] }}</p>
    </div>

    <p style="font-size:13px;color:#6b7280">
      The full proposal is attached as a PDF. Please review it at your convenience.
      If you have any questions, contact us at
      <a href="mailto:{{ $company['email'] }}" style="color:#F59E0B">{{ $company['email'] }}</a>.
    </p>

    <p>Kind regards,<br><strong>{{ $company['name'] }}</strong></p>
  </div>
  <div class="footer">
    <p>{{ $company['name'] }}{{ !empty($company['address']) ? ' · ' . $company['address'] . ', ' . $company['city'] : '' }}</p>
    @if(!empty($company['kra_pin']))<p>KRA PIN: {{ $company['kra_pin'] }}</p>@endif
    <p style="margin-top:8px">This email is confidential and intended only for the named recipient.</p>
  </div>
</div>
</body>
</html>
/**
 * invoices/show.tsx
 *
 * Refactored to add:
 *  1. Mobile-money payment channels (M-Pesa STK push, Airtel, MTN, cash, bank)
 *  2. WhatsApp / SMS send option alongside email
 *  3. Forex gain/loss display for multi-currency invoices
 *  4. Payment method icons and receipt status
 */
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { type BreadcrumbItem } from '@/types';
import {
    Send, CreditCard, Edit, Trash2, CheckCircle2, X, FileText, Download,
    Mail, MessageSquare, Smartphone, RefreshCw, AlertTriangle, TrendingUp,
    TrendingDown, Globe, Zap,
} from 'lucide-react';
import { useState } from 'react';
import { useDeleteConfirmation, useConfirmDialog } from '@/components/ui/confirm-dialog';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

// ── Types ──────────────────────────────────────────────────────────────────────
interface LineItem { description: string; quantity: number; unit_price: number; amount: number }
interface PaymentRecord {
    id: number; amount: number; method: string; channel?: string;
    reference: string | null; mobile_money_code: string | null;
    mobile_money_phone: string | null; paid_at: string; notes: string | null;
}
interface Invoice {
    id: number; number: string; status: string; currency: string;
    issue_date: string; due_date: string; sent_at: string | null;
    subtotal: number; tax: number; total: number; notes: string | null;
    exchange_rate: number | null; functional_currency: string | null;
    functional_total: number | null; forex_gain_loss: number | null;
    buyer_kra_pin: string | null; buyer_name: string | null;
    lines: LineItem[];
    client: { id: number; name: string; email: string; phone?: string } | null;
    project: { id: number; name: string } | null;
    payments: PaymentRecord[];
    etims_status?: string; etims_invoice_number?: string; etims_qr_url?: string;
}

interface Props { invoice: Invoice; amount_paid: number; amount_due: number; etims_enabled: boolean }

// ── Config ─────────────────────────────────────────────────────────────────────
const STATUS: Record<string, { label: string; dot: string; pill: string }> = {
    draft:     { label: 'Draft',     dot: 'bg-slate-400',   pill: 'bg-slate-50 text-slate-600 ring-slate-200' },
    issued:    { label: 'Issued',    dot: 'bg-blue-500',    pill: 'bg-blue-50 text-blue-700 ring-blue-200' },
    paid:      { label: 'Paid',      dot: 'bg-emerald-500', pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
    overdue:   { label: 'Overdue',   dot: 'bg-red-500',     pill: 'bg-red-50 text-red-700 ring-red-200' },
    cancelled: { label: 'Cancelled', dot: 'bg-zinc-400',    pill: 'bg-zinc-50 text-zinc-500 ring-zinc-200' },
};

const CHANNEL_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
    mpesa:        { label: 'M-Pesa',       color: 'bg-emerald-50 text-emerald-700 ring-emerald-200', icon: '📱' },
    airtel_money: { label: 'Airtel Money', color: 'bg-red-50 text-red-700 ring-red-200',             icon: '📱' },
    mtn_momo:     { label: 'MTN MoMo',     color: 'bg-amber-50 text-amber-700 ring-amber-200',       icon: '📱' },
    bank:         { label: 'Bank',         color: 'bg-blue-50 text-blue-700 ring-blue-200',           icon: '🏦' },
    cash:         { label: 'Cash',         color: 'bg-zinc-50 text-zinc-700 ring-zinc-200',           icon: '💵' },
    card:         { label: 'Card',         color: 'bg-violet-50 text-violet-700 ring-violet-200',     icon: '💳' },
    cheque:       { label: 'Cheque',       color: 'bg-slate-50 text-slate-700 ring-slate-200',        icon: '📝' },
    crypto:       { label: 'Crypto',       color: 'bg-orange-50 text-orange-700 ring-orange-200',     icon: '🔗' },
};

const MOBILE_CHANNELS = ['mpesa', 'airtel_money', 'mtn_momo'];

const fmt     = (n: number, c = 'KES') =>
    new Intl.NumberFormat('en-KE', { style: 'currency', currency: c, maximumFractionDigits: 2 }).format(n);
const fmtDate = (d: string) => format(new Date(d), 'MMM d, yyyy');

function csrfToken() {
    return (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';
}
function postJson(url: string, data: Record<string, unknown> = {}) {
    return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken() },
        body: JSON.stringify(data),
    }).then(r => r.json());
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function InvoiceShow({ invoice, amount_paid, amount_due, etims_enabled }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Accounting', href: '/accounting' },
        { title: 'Invoices', href: '/invoices' },
        { title: invoice.number, href: `/invoices/${invoice.id}` },
    ];

    // UI state
    const [payOpen,      setPayOpen]      = useState(false);
    const [sendOpen,     setSendOpen]     = useState(false);
    const [mpesaOpen,    setMpesaOpen]    = useState(false);
    const [sendMessage,  setSendMessage]  = useState('');
    const [sendWhatsApp, setSendWhatsApp] = useState(true);
    const [sendEmail,    setSendEmail]    = useState(true);
    const [waBusy,       setWaBusy]       = useState(false);
    const [mpesaBusy,    setMpesaBusy]    = useState(false);
    const [mpesaResult,  setMpesaResult]  = useState<string | null>(null);
    const [mpesaPhone,   setMpesaPhone]   = useState(invoice.client?.phone ?? '');
    const [payForm, setPayForm] = useState({
        amount: String(amount_due),
        channel: 'mpesa',
        reference: '',
        mobile_money_code: '',
        mobile_money_phone: invoice.client?.phone ?? '',
        notes: '',
        paid_at: new Date().toISOString().slice(0, 10),
    });
    const [saving,  setSaving]  = useState(false);
    const [sending, setSending] = useState(false);

    const { confirmDelete, ConfirmDialog } = useDeleteConfirmation();
    const { confirm } = useConfirmDialog();

    const sc       = STATUS[invoice.status] ?? STATUS.draft;
    const canEdit  = ['draft', 'issued'].includes(invoice.status);
    const canSend  = ['draft', 'issued', 'overdue'].includes(invoice.status);
    const canPay   = ['issued', 'overdue'].includes(invoice.status);
    const paidPct  = invoice.total > 0 ? Math.min(100, Math.round((amount_paid / invoice.total) * 100)) : 0;

    const isMobileChannel = MOBILE_CHANNELS.includes(payForm.channel);
    const channelCfg      = CHANNEL_CONFIG[payForm.channel] ?? CHANNEL_CONFIG.bank;

    // Forex summary
    const hasFx        = !!invoice.functional_currency && invoice.functional_currency !== invoice.currency;
    const fxGainLoss   = Number(invoice.forex_gain_loss ?? 0);
    const fxPositive   = fxGainLoss >= 0;

    function recordPayment() {
        setSaving(true);
        router.post(`/invoices/${invoice.id}/payment`, payForm, {
            onSuccess: () => { setPayOpen(false); setSaving(false); },
            onFinish:  () => setSaving(false),
            preserveScroll: true,
        });
    }

    function sendInvoice() {
        setSending(true);
        router.post(`/invoices/${invoice.id}/send`, {
            message: sendMessage,
            send_whatsapp: sendWhatsApp,
            send_sms: sendWhatsApp,
            send_email: sendEmail,
            whatsapp_phone: invoice.client?.phone ?? '',
        }, {
            onSuccess: () => { setSendOpen(false); setSending(false); },
            onFinish:  () => setSending(false),
            preserveScroll: true,
        });
    }

    async function initiateMpesaPush() {
        setMpesaBusy(true);
        setMpesaResult(null);
        try {
            const res = await postJson(`/invoices/${invoice.id}/mpesa-push`, {
                phone: mpesaPhone,
            });
            setMpesaResult(res.success
                ? '✅ STK push sent — customer should see M-Pesa prompt'
                : `❌ ${res.error ?? 'Failed'}`
            );
        } catch {
            setMpesaResult('❌ Network error');
        } finally {
            setMpesaBusy(false);
        }
    }

    async function sendWhatsAppOnly() {
        setWaBusy(true);
        const phone = invoice.client?.phone ?? '';
        if (!phone) { setWaBusy(false); return; }
        await postJson(`/invoices/${invoice.id}/whatsapp`, { phone });
        setWaBusy(false);
    }

    const handleCancel = () => confirm({
        title: 'Cancel Invoice',
        description: 'Cancel this invoice? This cannot be undone.',
        confirmLabel: 'Cancel Invoice',
        variant: 'warning',
        onConfirm: async () => { router.post(`/invoices/${invoice.id}/cancel`, {}, { preserveScroll: true }); },
    });

    const handleDelete = () => confirmDelete({
        itemName: `Invoice ${invoice.number}`,
        onConfirm: async () => { router.delete(`/invoices/${invoice.id}`); },
    });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Invoice ${invoice.number}`} />
            <ConfirmDialog />

            <div className="flex flex-col h-full">
                {/* ── Record header ── */}
                <div className="bg-card border-b border-border">
                    <div className="px-6 pt-5 pb-0">
                        <div className="flex items-start justify-between gap-4 mb-3">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                        <h1 className="text-lg font-bold font-mono">{invoice.number}</h1>
                                        <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ring-1', sc.pill)}>
                                            <span className={cn('h-1.5 w-1.5 rounded-full', sc.dot)} />
                                            {sc.label}
                                        </span>
                                        {/* eTIMS badge */}
                                        {etims_enabled && invoice.etims_status && invoice.etims_status !== 'not_submitted' && (
                                            <span className={cn(
                                                'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ring-1',
                                                invoice.etims_status === 'accepted'
                                                    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                                                    : invoice.etims_status === 'rejected'
                                                    ? 'bg-red-50 text-red-700 ring-red-200'
                                                    : 'bg-amber-50 text-amber-700 ring-amber-200'
                                            )}>
                                                <Zap className="h-3 w-3" />
                                                eTIMS {invoice.etims_status}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        {invoice.client?.name ?? 'No client'} — Issued {fmtDate(invoice.issue_date)} · Due {fmtDate(invoice.due_date)}
                                    </p>
                                </div>
                            </div>

                            {/* Action buttons */}
                            <div className="flex flex-wrap gap-2 shrink-0">
                                {canSend && (
                                    <Button size="sm" variant="outline" onClick={() => setSendOpen(true)} className="gap-1.5">
                                        <Send className="h-3.5 w-3.5" /> Send
                                    </Button>
                                )}
                                {canSend && invoice.client?.phone && (
                                    <Button size="sm" variant="outline" onClick={sendWhatsAppOnly}
                                        disabled={waBusy} className="gap-1.5">
                                        <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                                        {waBusy ? '…' : 'WhatsApp'}
                                    </Button>
                                )}
                                {canPay && (
                                    <Button size="sm" onClick={() => setPayOpen(true)}
                                        className="bg-amber-500 hover:bg-amber-600 text-white gap-1.5">
                                        <CreditCard className="h-3.5 w-3.5" /> Record Payment
                                    </Button>
                                )}
                                {canEdit && (
                                    <Link href={`/invoices/${invoice.id}/edit`}>
                                        <Button size="sm" variant="outline"><Edit className="h-3.5 w-3.5" /></Button>
                                    </Link>
                                )}
                            </div>
                        </div>

                        {/* Progress bar */}
                        <div className="h-1 bg-muted rounded-full overflow-hidden mb-0">
                            <div className="h-full bg-emerald-500 transition-all"
                                style={{ width: `${paidPct}%` }} />
                        </div>
                    </div>
                </div>

                {/* ── Main content ── */}
                <div className="flex-1 overflow-auto p-6">
                    <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-5">

                        {/* ── Left: invoice detail ── */}
                        <div className="lg:col-span-2 space-y-5">
                            {/* Line items */}
                            <div className="bg-card border border-border rounded-xl overflow-hidden">
                                <div className="px-5 py-3.5 border-b border-border bg-muted/30">
                                    <p className="text-sm font-semibold">Line Items</p>
                                </div>
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/20">
                                            <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</th>
                                            <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Qty</th>
                                            <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Unit Price</th>
                                            <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {invoice.lines.map((line, i) => (
                                            <tr key={i} className="hover:bg-muted/10">
                                                <td className="px-4 py-3">{line.description}</td>
                                                <td className="px-4 py-3 text-right text-muted-foreground">{line.quantity}</td>
                                                <td className="px-4 py-3 text-right text-muted-foreground">{fmt(line.unit_price, invoice.currency)}</td>
                                                <td className="px-4 py-3 text-right font-medium">{fmt(line.amount, invoice.currency)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t border-border bg-muted/20">
                                            <td colSpan={3} className="px-4 py-2.5 text-right text-xs text-muted-foreground">Subtotal</td>
                                            <td className="px-4 py-2.5 text-right text-sm">{fmt(invoice.subtotal, invoice.currency)}</td>
                                        </tr>
                                        {invoice.tax > 0 && (
                                            <tr className="border-t border-border">
                                                <td colSpan={3} className="px-4 py-2.5 text-right text-xs text-muted-foreground">VAT</td>
                                                <td className="px-4 py-2.5 text-right text-sm">{fmt(invoice.tax, invoice.currency)}</td>
                                            </tr>
                                        )}
                                        <tr className="border-t-2 border-border">
                                            <td colSpan={3} className="px-4 py-3 text-right text-sm font-semibold">Total</td>
                                            <td className="px-4 py-3 text-right text-lg font-bold">{fmt(invoice.total, invoice.currency)}</td>
                                        </tr>
                                        {/* Functional currency conversion */}
                                        {hasFx && invoice.functional_total && (
                                            <tr className="border-t border-border/50">
                                                <td colSpan={3} className="px-4 py-2 text-right text-xs text-muted-foreground flex items-center justify-end gap-1">
                                                    <Globe className="h-3 w-3" />
                                                    ≈ {invoice.functional_currency} (rate: {Number(invoice.exchange_rate).toFixed(4)})
                                                </td>
                                                <td className="px-4 py-2 text-right text-sm text-muted-foreground">
                                                    {fmt(invoice.functional_total, invoice.functional_currency!)}
                                                </td>
                                            </tr>
                                        )}
                                        {/* Forex gain/loss */}
                                        {hasFx && fxGainLoss !== 0 && (
                                            <tr className="border-t border-border/50">
                                                <td colSpan={3} className="px-4 py-1.5 text-right text-xs text-muted-foreground">
                                                    Realised FX {fxPositive ? 'gain' : 'loss'}
                                                </td>
                                                <td className={cn('px-4 py-1.5 text-right text-xs font-medium flex items-center justify-end gap-1',
                                                    fxPositive ? 'text-emerald-600' : 'text-red-600')}>
                                                    {fxPositive
                                                        ? <TrendingUp className="h-3 w-3" />
                                                        : <TrendingDown className="h-3 w-3" />
                                                    }
                                                    {fxPositive ? '+' : ''}{fmt(fxGainLoss, invoice.functional_currency!)}
                                                </td>
                                            </tr>
                                        )}
                                    </tfoot>
                                </table>
                            </div>

                            {/* Payments */}
                            {invoice.payments.length > 0 && (
                                <div className="bg-card border border-border rounded-xl overflow-hidden">
                                    <div className="px-5 py-3.5 border-b border-border bg-muted/30 flex justify-between items-center">
                                        <p className="text-sm font-semibold">Payments ({invoice.payments.length})</p>
                                        <span className="text-xs text-emerald-600 font-medium">{paidPct}% paid</span>
                                    </div>
                                    <div className="divide-y divide-border">
                                        {invoice.payments.map(p => {
                                            const ch = CHANNEL_CONFIG[p.channel ?? p.method] ?? CHANNEL_CONFIG.bank;
                                            return (
                                                <div key={p.id} className="px-4 py-3 flex items-center justify-between gap-3">
                                                    <div className="flex items-center gap-2.5">
                                                        <span className="text-lg">{ch.icon}</span>
                                                        <div>
                                                            <div className="flex items-center gap-1.5">
                                                                <span className={cn('text-xs font-medium px-1.5 py-0.5 rounded ring-1', ch.color)}>
                                                                    {ch.label}
                                                                </span>
                                                                {p.mobile_money_code && (
                                                                    <span className="text-xs font-mono text-muted-foreground">
                                                                        {p.mobile_money_code}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                                {fmtDate(p.paid_at)}
                                                                {p.mobile_money_phone && ` · ${p.mobile_money_phone}`}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <span className="font-semibold text-emerald-600">
                                                        +{fmt(p.amount, invoice.currency)}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="px-4 py-3 border-t border-border bg-muted/20 flex justify-between text-sm">
                                        <span className="text-muted-foreground">Balance due</span>
                                        <span className={cn('font-bold', amount_due > 0 ? 'text-red-600' : 'text-emerald-600')}>
                                            {fmt(amount_due, invoice.currency)}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ── Right: sidebar ── */}
                        <div className="space-y-4">
                            {/* Payment summary */}
                            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Payment Summary</p>
                                {[
                                    { label: 'Total',     value: fmt(invoice.total, invoice.currency),  bold: true },
                                    { label: 'Paid',      value: fmt(amount_paid, invoice.currency),    color: 'text-emerald-600' },
                                    { label: 'Balance',   value: fmt(amount_due, invoice.currency),     color: amount_due > 0 ? 'text-red-600' : 'text-emerald-600', bold: true },
                                ].map(row => (
                                    <div key={row.label} className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">{row.label}</span>
                                        <span className={cn(row.color, row.bold && 'font-bold')}>{row.value}</span>
                                    </div>
                                ))}
                            </div>

                            {/* M-Pesa STK push quick panel */}
                            {canPay && (
                                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 dark:bg-emerald-950/20 dark:border-emerald-800">
                                    <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-200 mb-2 flex items-center gap-1.5">
                                        <Smartphone className="h-3.5 w-3.5" /> M-Pesa STK Push
                                    </p>
                                    <div className="space-y-2">
                                        <Input
                                            placeholder="254712345678"
                                            value={mpesaPhone}
                                            onChange={e => setMpesaPhone(e.target.value)}
                                            className="h-8 text-xs font-mono bg-white dark:bg-background"
                                        />
                                        <Button size="sm" onClick={initiateMpesaPush} disabled={mpesaBusy || !mpesaPhone}
                                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5">
                                            {mpesaBusy ? <><RefreshCw className="h-3 w-3 animate-spin" /> Sending…</> : 'Send STK Push'}
                                        </Button>
                                        {mpesaResult && (
                                            <p className="text-xs text-center">{mpesaResult}</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Invoice details */}
                            <div className="bg-card border border-border rounded-xl p-4 space-y-2.5">
                                {[
                                    { label: 'Client',    value: invoice.client?.name },
                                    { label: 'Project',   value: invoice.project?.name },
                                    { label: 'Currency',  value: invoice.currency },
                                    { label: 'KRA PIN',   value: invoice.buyer_kra_pin },
                                    { label: 'Issued',    value: fmtDate(invoice.issue_date) },
                                    { label: 'Due',       value: fmtDate(invoice.due_date) },
                                ].filter(r => r.value).map(row => (
                                    <div key={row.label} className="flex justify-between text-xs">
                                        <span className="text-muted-foreground">{row.label}</span>
                                        <span className="font-medium">{row.value}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Quick actions */}
                            <div className="space-y-2">
                                <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs"
                                    onClick={() => window.open(`/invoices/${invoice.id}/pdf`, '_blank')}>
                                    <Download className="h-3.5 w-3.5" /> Download PDF
                                </Button>
                                {invoice.status === 'overdue' && (
                                    <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs border-amber-200 text-amber-700 hover:bg-amber-50"
                                        onClick={() => router.post(`/invoices/${invoice.id}/reminder`, {}, { preserveScroll: true })}>
                                        <AlertTriangle className="h-3.5 w-3.5" /> Send Reminder
                                    </Button>
                                )}
                                {canEdit && (
                                    <Button variant="outline" size="sm" onClick={handleCancel}
                                        className="w-full text-xs border-red-200 text-red-600 hover:bg-red-50">
                                        Cancel Invoice
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Record Payment Modal ── */}
            {payOpen && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-xl">
                        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                            <h2 className="text-sm font-semibold">Record Payment</h2>
                            <button onClick={() => setPayOpen(false)} className="text-muted-foreground hover:text-foreground">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Payment Channel</label>
                                <div className="grid grid-cols-3 gap-1.5">
                                    {Object.entries(CHANNEL_CONFIG).map(([key, cfg]) => (
                                        <button key={key} onClick={() => setPayForm(p => ({ ...p, channel: key }))}
                                            className={cn(
                                                'p-2 rounded-lg border text-xs font-medium transition-all text-center',
                                                payForm.channel === key
                                                    ? 'bg-amber-50 border-amber-400 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300'
                                                    : 'bg-background border-border text-muted-foreground hover:border-amber-200'
                                            )}>
                                            <div>{cfg.icon}</div>
                                            <div>{cfg.label}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Amount ({invoice.currency})</label>
                                <Input type="number" step="0.01" value={payForm.amount}
                                    onChange={e => setPayForm(p => ({ ...p, amount: e.target.value }))} />
                            </div>

                            {/* Mobile money fields */}
                            {isMobileChannel && (
                                <>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                            {channelCfg.label} Transaction Code
                                        </label>
                                        <Input className="font-mono" placeholder="e.g. QK7XXXXXXX"
                                            value={payForm.mobile_money_code}
                                            onChange={e => setPayForm(p => ({ ...p, mobile_money_code: e.target.value.toUpperCase() }))} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phone Number</label>
                                        <Input type="tel" placeholder="254712345678"
                                            value={payForm.mobile_money_phone}
                                            onChange={e => setPayForm(p => ({ ...p, mobile_money_phone: e.target.value }))} />
                                    </div>
                                </>
                            )}

                            {/* Bank fields */}
                            {!isMobileChannel && payForm.channel !== 'cash' && (
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reference</label>
                                    <Input value={payForm.reference}
                                        onChange={e => setPayForm(p => ({ ...p, reference: e.target.value }))} />
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date Paid</label>
                                <Input type="date" value={payForm.paid_at}
                                    onChange={e => setPayForm(p => ({ ...p, paid_at: e.target.value }))} />
                            </div>

                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 dark:bg-blue-950/20 dark:border-blue-800 dark:text-blue-300">
                                📱 A payment receipt will be sent via WhatsApp / SMS automatically.
                            </div>
                        </div>
                        <div className="px-5 py-4 border-t border-border flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => setPayOpen(false)}>Cancel</Button>
                            <Button size="sm" onClick={recordPayment} disabled={saving}
                                className="bg-amber-500 hover:bg-amber-600 text-white">
                                {saving ? 'Saving…' : 'Record Payment'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Send Invoice Modal ── */}
            {sendOpen && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-xl">
                        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                            <h2 className="text-sm font-semibold">Send Invoice</h2>
                            <button onClick={() => setSendOpen(false)}><X className="h-4 w-4 text-muted-foreground" /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="space-y-2">
                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Channels</p>
                                <label className="flex items-center gap-2.5 cursor-pointer">
                                    <input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} />
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">Email{invoice.client?.email ? ` (${invoice.client.email})` : ' — no email on file'}</span>
                                </label>
                                <label className="flex items-center gap-2.5 cursor-pointer">
                                    <input type="checkbox" checked={sendWhatsApp} onChange={e => setSendWhatsApp(e.target.checked)} />
                                    <MessageSquare className="h-4 w-4 text-emerald-600" />
                                    <span className="text-sm">WhatsApp / SMS{invoice.client?.phone ? ` (${invoice.client.phone})` : ' — no phone on file'}</span>
                                </label>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Personal message (optional)</label>
                                <textarea
                                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                                    rows={3} placeholder="Dear Client, please find attached…"
                                    value={sendMessage} onChange={e => setSendMessage(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="px-5 py-4 border-t border-border flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => setSendOpen(false)}>Cancel</Button>
                            <Button size="sm" onClick={sendInvoice} disabled={sending || (!sendEmail && !sendWhatsApp)}
                                className="bg-amber-500 hover:bg-amber-600 text-white gap-1.5">
                                <Send className="h-3.5 w-3.5" />
                                {sending ? 'Sending…' : 'Send Invoice'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}

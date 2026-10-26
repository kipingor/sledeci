/**
 * payments/show.tsx — refactored for mobile money
 *
 * Changes from original:
 *  1. Channel pill with icon (M-Pesa / Airtel / MTN / Bank / etc.)
 *  2. Mobile money transaction code, phone number, raw payload (collapsible)
 *  3. Reconciliation status with manual "Mark Matched / Unmatched" actions
 *  4. Functional currency conversion display (if FX applicable)
 *  5. Link to message log (receipt sent confirmation)
 */
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import {
    CreditCard, DollarSign, Hash, Calendar, CheckCircle2, Clock, XCircle,
    RefreshCw, Smartphone, Phone, Globe, MessageSquare, ChevronDown, ChevronUp,
    AlertTriangle, Link2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useState } from 'react';

const CHANNEL_CONFIG: Record<string, { label: string; pill: string; icon: string }> = {
    mpesa:        { label: 'M-Pesa',       pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200', icon: '📱' },
    airtel_money: { label: 'Airtel Money', pill: 'bg-red-50 text-red-700 ring-red-200',             icon: '📱' },
    mtn_momo:     { label: 'MTN MoMo',     pill: 'bg-amber-50 text-amber-700 ring-amber-200',       icon: '📱' },
    bank:         { label: 'Bank Transfer',pill: 'bg-blue-50 text-blue-700 ring-blue-200',           icon: '🏦' },
    cash:         { label: 'Cash',         pill: 'bg-zinc-50 text-zinc-700 ring-zinc-200',           icon: '💵' },
    card:         { label: 'Card',         pill: 'bg-violet-50 text-violet-700 ring-violet-200',     icon: '💳' },
    cheque:       { label: 'Cheque',       pill: 'bg-slate-50 text-slate-600 ring-slate-200',        icon: '📝' },
    crypto:       { label: 'Crypto',       pill: 'bg-orange-50 text-orange-700 ring-orange-200',     icon: '🔗' },
};

const RECON_CONFIG: Record<string, { label: string; cls: string; icon: React.ComponentType<any> }> = {
    matched:   { label: 'Matched',   cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200', icon: CheckCircle2 },
    pending:   { label: 'Pending',   cls: 'bg-amber-50 text-amber-700 ring-amber-200',         icon: Clock },
    unmatched: { label: 'Unmatched', cls: 'bg-red-50 text-red-700 ring-red-200',               icon: AlertTriangle },
    exception: { label: 'Exception', cls: 'bg-orange-50 text-orange-700 ring-orange-200',      icon: XCircle },
};

const fmt = (n: number, c = 'KES') =>
    new Intl.NumberFormat('en-KE', { style: 'currency', currency: c }).format(n);

interface MessageLogEntry {
    id: number;
    channel: string;
    status: string;
    template: string;
    sent_at: string | null;
}

interface Payment {
    id: number;
    amount: number;
    currency: string;
    method: string;
    channel: string | null;
    reference: string | null;
    mobile_money_code: string | null;
    mobile_money_phone: string | null;
    mobile_money_payload: Record<string, unknown> | null;
    reconciliation_status: string | null;
    exchange_rate: number | null;
    functional_amount: number | null;
    paid_at: string;
    notes: string | null;
    invoice: { id: number; number: string; currency: string } | null;
    receivedBy?: { id: number; name: string } | null;
    messageLogs?: MessageLogEntry[];
}

interface Props {
    payment: Payment;
    functional_currency: string;
    unmatched_invoices?: { id: number; number: string; total: number; currency: string }[];
}

function csrfToken() {
    return (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';
}

export default function PaymentShow({ payment, functional_currency, unmatched_invoices = [] }: Props) {
    const [showPayload, setShowPayload] = useState(false);
    const [linking, setLinking] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState('');

    const channelKey = payment.channel ?? payment.method ?? 'bank';
    const ch    = CHANNEL_CONFIG[channelKey] ?? CHANNEL_CONFIG.bank;
    const recon = RECON_CONFIG[payment.reconciliation_status ?? 'pending'];
    const ReconIcon = recon.icon;

    const isMobile = ['mpesa', 'airtel_money', 'mtn_momo'].includes(channelKey);
    const hasFx    = payment.exchange_rate && payment.exchange_rate !== 1 && payment.functional_amount;

    function updateReconciliation(status: string) {
        router.patch(`/payments/${payment.id}/reconciliation`, { reconciliation_status: status }, {
            preserveScroll: true,
        });
    }

    function linkToInvoice() {
        if (!selectedInvoice) return;
        setLinking(true);
        router.patch(`/payments/${payment.id}/link-invoice`, { invoice_id: selectedInvoice }, {
            preserveScroll: true,
            onFinish: () => setLinking(false),
        });
    }

    return (
        <AppLayout breadcrumbs={[{ title: 'Payments', href: '/payments' }, { title: `Payment #${payment.id}`, href: '#' }]}>
            <Head title={`Payment #${payment.id}`} />
            <div className="flex flex-col h-full">

                {/* Header */}
                <div className="bg-card border-b border-border px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-lg">
                                {ch.icon}
                            </div>
                            <div>
                                <div className="flex items-center gap-2.5">
                                    <h1 className="text-xl font-bold tracking-tight tabular-nums">
                                        {fmt(payment.amount, payment.currency)}
                                    </h1>
                                    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ring-1', ch.pill)}>
                                        {ch.icon} {ch.label}
                                    </span>
                                </div>
                                {payment.invoice ? (
                                    <p className="text-sm text-muted-foreground mt-0.5">
                                        Invoice{' '}
                                        <Link href={`/invoices/${payment.invoice.id}`} className="text-primary hover:underline font-mono">
                                            {payment.invoice.number}
                                        </Link>
                                    </p>
                                ) : (
                                    <p className="text-sm text-amber-600 mt-0.5 flex items-center gap-1">
                                        <AlertTriangle className="h-3.5 w-3.5" /> Not linked to an invoice
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-auto bg-background p-6">
                    <div className="max-w-2xl space-y-4">

                        {/* Core details */}
                        <div className="bg-card border border-border rounded-lg p-5 space-y-3 text-sm">
                            {[
                                { label: 'Amount',    value: fmt(payment.amount, payment.currency), icon: DollarSign },
                                { label: 'Channel',   value: `${ch.icon} ${ch.label}`,               icon: CreditCard },
                                { label: 'Reference', value: payment.reference ?? '—',               icon: Hash },
                                { label: 'Date',      value: format(new Date(payment.paid_at), 'MMM d, yyyy'), icon: Calendar },
                                ...(payment.receivedBy ? [{ label: 'Received By', value: payment.receivedBy.name, icon: CheckCircle2 }] : []),
                            ].map(({ label, value, icon: RowIcon }) => (
                                <div key={label} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <RowIcon className="h-3.5 w-3.5" />
                                        <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
                                    </div>
                                    <span className="font-medium tabular-nums">{value}</span>
                                </div>
                            ))}

                            {/* Forex conversion */}
                            {hasFx && (
                                <div className="flex items-center justify-between py-2 border-t border-border/50 pt-3">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Globe className="h-3.5 w-3.5" />
                                        <span className="text-xs font-semibold uppercase tracking-wider">≈ {functional_currency}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="font-medium tabular-nums">
                                            {fmt(payment.functional_amount!, functional_currency)}
                                        </span>
                                        <p className="text-[10px] text-muted-foreground">
                                            rate: {Number(payment.exchange_rate).toFixed(4)}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Mobile money details */}
                        {isMobile && (
                            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-5 space-y-3 dark:bg-emerald-950/20 dark:border-emerald-800">
                                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                                    <Smartphone className="h-3.5 w-3.5" /> {ch.label} Details
                                </p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 uppercase tracking-wider mb-0.5">Transaction Code</p>
                                        <p className="font-mono font-bold text-sm text-emerald-900 dark:text-emerald-200">
                                            {payment.mobile_money_code ?? '—'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                                            <Phone className="h-3 w-3" /> Phone Number
                                        </p>
                                        <p className="font-mono font-bold text-sm text-emerald-900 dark:text-emerald-200">
                                            {payment.mobile_money_phone ?? '—'}
                                        </p>
                                    </div>
                                </div>

                                {/* Raw payload (collapsible) */}
                                {payment.mobile_money_payload && (
                                    <div>
                                        <button onClick={() => setShowPayload(v => !v)}
                                            className="flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-900 dark:text-emerald-400">
                                            {showPayload ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                            {showPayload ? 'Hide' : 'View'} raw callback payload
                                        </button>
                                        {showPayload && (
                                            <pre className="mt-2 p-3 bg-white/60 dark:bg-black/20 rounded text-[10px] font-mono overflow-x-auto max-h-48">
                                                {JSON.stringify(payment.mobile_money_payload, null, 2)}
                                            </pre>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Reconciliation */}
                        {isMobile && (
                            <div className="bg-card border border-border rounded-lg p-5 space-y-3">
                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reconciliation</p>
                                <div className="flex items-center justify-between">
                                    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ring-1', recon.cls)}>
                                        <ReconIcon className="h-3 w-3" />
                                        {recon.label}
                                    </span>
                                    {payment.reconciliation_status !== 'matched' && (
                                        <div className="flex gap-2">
                                            <Button size="sm" variant="outline"
                                                onClick={() => updateReconciliation('matched')}
                                                className="text-xs gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                                                <CheckCircle2 className="h-3.5 w-3.5" /> Mark Matched
                                            </Button>
                                            <Button size="sm" variant="outline"
                                                onClick={() => updateReconciliation('exception')}
                                                className="text-xs gap-1.5 border-orange-200 text-orange-700 hover:bg-orange-50">
                                                <XCircle className="h-3.5 w-3.5" /> Flag Exception
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                {/* Link to invoice (if unlinked) */}
                                {!payment.invoice && unmatched_invoices.length > 0 && (
                                    <div className="pt-3 border-t border-border/50 space-y-2">
                                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                            <Link2 className="h-3.5 w-3.5" /> Link this payment to an invoice
                                        </p>
                                        <div className="flex gap-2">
                                            <select value={selectedInvoice} onChange={e => setSelectedInvoice(e.target.value)}
                                                className="flex-1 h-8 text-xs rounded-md border border-input bg-background px-2">
                                                <option value="">— Select invoice —</option>
                                                {unmatched_invoices.map(inv => (
                                                    <option key={inv.id} value={inv.id}>
                                                        {inv.number} — {fmt(inv.total, inv.currency)}
                                                    </option>
                                                ))}
                                            </select>
                                            <Button size="sm" onClick={linkToInvoice} disabled={!selectedInvoice || linking}
                                                className="bg-amber-500 hover:bg-amber-600 text-white text-xs">
                                                {linking ? 'Linking…' : 'Link'}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Receipt delivery status */}
                        {payment.messageLogs && payment.messageLogs.length > 0 && (
                            <div className="bg-card border border-border rounded-lg p-5">
                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                                    <MessageSquare className="h-3.5 w-3.5" /> Receipt Delivery
                                </p>
                                <div className="space-y-2">
                                    {payment.messageLogs.map(log => (
                                        <div key={log.id} className="flex items-center justify-between text-xs">
                                            <span className="capitalize text-muted-foreground">{log.channel} · {log.template.replace('_', ' ')}</span>
                                            <span className={cn(
                                                'font-medium px-2 py-0.5 rounded-full ring-1',
                                                log.status === 'sent' || log.status === 'delivered'
                                                    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                                                    : 'bg-red-50 text-red-700 ring-red-200'
                                            )}>
                                                {log.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {payment.notes && (
                            <div className="bg-card border border-border rounded-lg p-5">
                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Notes</p>
                                <p className="text-sm text-muted-foreground">{payment.notes}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

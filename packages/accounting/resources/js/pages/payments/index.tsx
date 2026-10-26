/**
 * payments/index.tsx  — refactored for mobile money
 *
 * Changes from original:
 *  1. Channel column (M-Pesa / Airtel / MTN / Bank / Cash) with icons
 *  2. mobile_money_code shown in reference column (font-mono, copyable)
 *  3. reconciliation_status filter tab (Matched / Unmatched / Exception)
 *  4. Unmatched payment alert banner linking to reconciliation action
 *  5. Currency-aware totals (en-KE locale)
 */
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { type BreadcrumbItem } from '@/types';
import {
    CreditCard, DollarSign, CheckCircle2, Clock, XCircle,
    Search, AlertTriangle, Smartphone, Copy, Check,
} from 'lucide-react';
import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Payments', href: '/payments' }];

// ── Config ─────────────────────────────────────────────────────────────────────
const CHANNEL_CONFIG: Record<string, { label: string; pill: string; icon: string }> = {
    mpesa:        { label: 'M-Pesa',       pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200', icon: '📱' },
    airtel_money: { label: 'Airtel Money', pill: 'bg-red-50 text-red-700 ring-red-200',             icon: '📱' },
    mtn_momo:     { label: 'MTN MoMo',     pill: 'bg-amber-50 text-amber-700 ring-amber-200',       icon: '📱' },
    bank:         { label: 'Bank',         pill: 'bg-blue-50 text-blue-700 ring-blue-200',           icon: '🏦' },
    cash:         { label: 'Cash',         pill: 'bg-zinc-50 text-zinc-700 ring-zinc-200',           icon: '💵' },
    card:         { label: 'Card',         pill: 'bg-violet-50 text-violet-700 ring-violet-200',     icon: '💳' },
    cheque:       { label: 'Cheque',       pill: 'bg-slate-50 text-slate-600 ring-slate-200',        icon: '📝' },
    crypto:       { label: 'Crypto',       pill: 'bg-orange-50 text-orange-700 ring-orange-200',     icon: '🔗' },
};

const RECON_CONFIG: Record<string, { label: string; pill: string }> = {
    matched:   { label: 'Matched',   pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
    pending:   { label: 'Pending',   pill: 'bg-amber-50 text-amber-700 ring-amber-200' },
    unmatched: { label: 'Unmatched', pill: 'bg-red-50 text-red-700 ring-red-200' },
    exception: { label: 'Exception', pill: 'bg-orange-50 text-orange-700 ring-orange-200' },
};

const fmt = (n: number, c = 'KES') =>
    new Intl.NumberFormat('en-KE', { style: 'currency', currency: c }).format(n);
const fmtCompact = (n: number, c = 'KES') =>
    new Intl.NumberFormat('en-KE', { style: 'currency', currency: c, notation: 'compact', maximumFractionDigits: 1 }).format(n);

interface Payment {
    id: number;
    amount: number;
    currency: string;
    method: string;
    channel: string | null;
    reference: string | null;
    mobile_money_code: string | null;
    mobile_money_phone: string | null;
    reconciliation_status: string | null;
    paid_at: string;
    notes: string | null;
    invoice: { id: number; number: string } | null;
    client: { id: number; name: string } | null;
}

interface Totals {
    month: number;
    year: number;
    unmatched_count: number;
    unmatched_amount: number;
    by_channel: Record<string, number>;
}

interface Props {
    payments: { data: Payment[]; links: any[]; current_page: number; last_page: number; total: number };
    totals: Totals;
    filters: { search?: string; channel?: string; reconciliation_status?: string };
}

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);
    const copy = useCallback(() => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        });
    }, [text]);
    return (
        <button onClick={copy} className="ml-1 text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100">
            {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
        </button>
    );
}

export default function PaymentsIndex({ payments, totals, filters }: Props) {
    const [search,       setSearch]       = useState(filters.search ?? '');
    const [channelFilter, setChannelFilter] = useState(filters.channel ?? '');
    const [reconFilter,   setReconFilter]   = useState(filters.reconciliation_status ?? '');

    function applyFilters(overrides: Record<string, string> = {}) {
        router.get('/payments', {
            search:                overrides.search                ?? search,
            channel:               overrides.channel               ?? channelFilter,
            reconciliation_status: overrides.reconciliation_status ?? reconFilter,
        }, { preserveState: true, preserveScroll: true });
    }

    const mobileMoneySplit = Object.entries(totals.by_channel ?? {})
        .filter(([ch]) => ['mpesa', 'airtel_money', 'mtn_momo'].includes(ch));

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Payments" />
            <div className="flex flex-col h-full">

                {/* ── Header ── */}
                <div className="bg-card border-b border-border">
                    <div className="flex items-center justify-between px-6 py-3.5 border-b border-border/60">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                                <CreditCard className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-base font-bold tracking-tight">Payments</h1>
                                <p className="text-xs text-muted-foreground">{payments.total} total records</p>
                            </div>
                        </div>
                    </div>

                    {/* Stats strip */}
                    <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-border/60 border-b border-border/60">
                        <div className="px-4 py-3">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">This Month</p>
                            <p className="text-xl font-bold tabular-nums text-emerald-600">{fmtCompact(totals.month)}</p>
                        </div>
                        <div className="px-4 py-3">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">This Year</p>
                            <p className="text-xl font-bold tabular-nums">{fmtCompact(totals.year)}</p>
                        </div>
                        {/* Mobile money breakdown */}
                        <div className="px-4 py-3 md:col-span-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">By Mobile Channel</p>
                            <div className="flex flex-wrap gap-2">
                                {mobileMoneySplit.length === 0
                                    ? <span className="text-xs text-muted-foreground">No mobile payments yet</span>
                                    : mobileMoneySplit.map(([ch, amt]) => {
                                        const cfg = CHANNEL_CONFIG[ch] ?? CHANNEL_CONFIG.bank;
                                        return (
                                            <span key={ch} className={cn('inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ring-1', cfg.pill)}>
                                                {cfg.icon} {cfg.label}: {fmtCompact(amt)}
                                            </span>
                                        );
                                    })
                                }
                            </div>
                        </div>
                    </div>

                    {/* Unmatched warning */}
                    {totals.unmatched_count > 0 && (
                        <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-200 dark:bg-amber-950/20 dark:border-amber-800 flex items-center gap-2.5">
                            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                            <p className="text-xs text-amber-800 dark:text-amber-300">
                                <strong>{totals.unmatched_count} unmatched</strong> mobile money payment{totals.unmatched_count !== 1 ? 's' : ''} totalling{' '}
                                <strong>{fmt(totals.unmatched_amount)}</strong> need manual matching.
                            </p>
                            <button
                                onClick={() => { setReconFilter('unmatched'); applyFilters({ reconciliation_status: 'unmatched' }); }}
                                className="ml-auto text-xs font-semibold text-amber-700 hover:text-amber-900 underline whitespace-nowrap dark:text-amber-300">
                                View unmatched →
                            </button>
                        </div>
                    )}

                    {/* Filters */}
                    <div className="px-4 py-2.5 flex flex-wrap gap-2 items-center">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                                placeholder="Search code, invoice, phone…"
                                className="pl-8 h-8 text-xs w-56"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && applyFilters()}
                            />
                        </div>

                        {/* Channel filter */}
                        <select value={channelFilter}
                            onChange={e => { setChannelFilter(e.target.value); applyFilters({ channel: e.target.value }); }}
                            className="h-8 text-xs rounded-md border border-input bg-background px-2 focus:outline-none focus:ring-1 focus:ring-ring">
                            <option value="">All channels</option>
                            {Object.entries(CHANNEL_CONFIG).map(([k, v]) => (
                                <option key={k} value={k}>{v.icon} {v.label}</option>
                            ))}
                        </select>

                        {/* Reconciliation filter */}
                        <select value={reconFilter}
                            onChange={e => { setReconFilter(e.target.value); applyFilters({ reconciliation_status: e.target.value }); }}
                            className="h-8 text-xs rounded-md border border-input bg-background px-2 focus:outline-none focus:ring-1 focus:ring-ring">
                            <option value="">All reconciliation</option>
                            {Object.entries(RECON_CONFIG).map(([k, v]) => (
                                <option key={k} value={k}>{v.label}</option>
                            ))}
                        </select>

                        {(search || channelFilter || reconFilter) && (
                            <button onClick={() => { setSearch(''); setChannelFilter(''); setReconFilter(''); applyFilters({ search: '', channel: '', reconciliation_status: '' }); }}
                                className="text-xs text-muted-foreground hover:text-foreground underline">
                                Clear
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Table ── */}
                <div className="flex-1 overflow-auto bg-background">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-muted/40 border-b border-border sticky top-0 z-10">
                                {['Date', 'Invoice', 'Client', 'Channel', 'Transaction Code', 'Amount', 'Reconciliation', ''].map(h => (
                                    <th key={h} className={cn(
                                        'px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap',
                                        h === 'Amount' && 'text-right',
                                        h === '' && 'w-10',
                                    )}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {payments.data.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="py-20 text-center text-muted-foreground">
                                        <CreditCard className="h-10 w-10 mx-auto mb-3 opacity-20" />
                                        <p className="font-medium">No payments found</p>
                                        <p className="text-xs mt-1 opacity-70">Try adjusting your filters.</p>
                                    </td>
                                </tr>
                            )}
                            {payments.data.map(p => {
                                const ch       = CHANNEL_CONFIG[p.channel ?? p.method] ?? CHANNEL_CONFIG.bank;
                                const recon    = RECON_CONFIG[p.reconciliation_status ?? 'pending'];
                                const isMobile = ['mpesa', 'airtel_money', 'mtn_momo'].includes(p.channel ?? '');
                                const code     = p.mobile_money_code ?? p.reference;

                                return (
                                    <tr key={p.id} className="group hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                                            {format(new Date(p.paid_at), 'MMM d, yyyy')}
                                        </td>
                                        <td className="px-4 py-2.5">
                                            {p.invoice ? (
                                                <Link href={`/invoices/${p.invoice.id}`}
                                                    className="text-xs font-mono font-semibold text-primary hover:underline">
                                                    {p.invoice.number}
                                                </Link>
                                            ) : (
                                                <span className="text-xs text-muted-foreground/40 italic">Unlinked</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2.5 text-xs text-muted-foreground">
                                            {p.client?.name ?? '—'}
                                            {p.mobile_money_phone && (
                                                <p className="font-mono text-[10px] mt-0.5 text-muted-foreground/70">{p.mobile_money_phone}</p>
                                            )}
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <span className={cn('inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ring-1', ch.pill)}>
                                                {ch.icon} {ch.label}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5">
                                            {code ? (
                                                <div className="flex items-center">
                                                    <span className="text-xs font-mono font-semibold">{code}</span>
                                                    <CopyButton text={code} />
                                                </div>
                                            ) : (
                                                <span className="text-xs text-muted-foreground/40">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2.5 text-right">
                                            <span className="text-sm font-semibold tabular-nums text-emerald-600">
                                                +{fmt(p.amount, p.currency)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5">
                                            {isMobile && recon ? (
                                                <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full ring-1', recon.pill)}>
                                                    {recon.label}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-muted-foreground/40">—</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-2.5">
                                            <Link href={`/payments/${p.id}`}
                                                className="opacity-0 group-hover:opacity-100 text-xs text-primary hover:underline transition-opacity">
                                                View
                                            </Link>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {payments.last_page > 1 && (
                    <div className="flex items-center justify-center gap-1 px-6 py-2.5 border-t border-border bg-card">
                        {payments.links?.map((link: any, i: number) => (
                            link.url ? (
                                <Link key={i} href={link.url}
                                    className={cn('px-3 py-1 rounded text-xs border transition-colors',
                                        link.active
                                            ? 'bg-primary text-primary-foreground border-primary'
                                            : 'border-border text-muted-foreground hover:bg-muted')}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ) : (
                                <span key={i}
                                    className="px-3 py-1 rounded text-xs border border-border text-muted-foreground opacity-40"
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            )
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}

import AppLayout from '@/layouts/app-layout';
import { Head, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { type BreadcrumbItem } from '@/types';
import {
    DollarSign, TrendingUp, AlertTriangle, CreditCard, FileText,
    Bell, BarChart3, ArrowRight, Clock, BookOpen, Layers, RefreshCw,
    Scale, Activity, Receipt,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Accounting', href: '/accounting' }];

const INV_STATUS_PILL: Record<string, string> = {
    draft:     'bg-slate-50 text-slate-600 ring-slate-200',
    issued:    'bg-blue-50 text-blue-700 ring-blue-200',
    paid:      'bg-emerald-50 text-emerald-700 ring-emerald-200',
    overdue:   'bg-red-50 text-red-700 ring-red-200',
    cancelled: 'bg-zinc-50 text-zinc-500 ring-zinc-200',
};

const fmt = (n: number, c = 'USD') =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: c }).format(n);
const fmtDate = (d: string) =>
    format(new Date(d), 'MMM d, yyyy');

interface Props {
    summary:          { total_billed: number; total_collected: number; total_overdue: number; total_expenses: number };
    monthly:          { month: string; total: number }[];
    recentInvoices:   any[];
    overdueInvoices:  any[];
    recentPayments:   any[];
    pendingFollowUps: any[];
    invoicesByStatus: Record<string, { count: number; total: number }>;
}

export default function AccountingIndex({
    summary, monthly, recentInvoices, overdueInvoices, recentPayments, pendingFollowUps, invoicesByStatus,
}: Props) {
    const net = summary.total_collected - summary.total_expenses;
    const chartData = monthly.map(m => ({ month: m.month.slice(5), amount: Number(m.total) }));

    const kpiCards = [
        { label: 'Total Billed',  value: fmt(summary.total_billed),   icon: FileText,      color: 'text-foreground',  bg: 'bg-muted' },
        { label: 'Collected',     value: fmt(summary.total_collected), icon: TrendingUp,    color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'Overdue',       value: fmt(summary.total_overdue),   icon: AlertTriangle, color: 'text-red-600',     bg: 'bg-red-50' },
        { label: 'Net Revenue',   value: fmt(net),                     icon: DollarSign,    color: net >= 0 ? 'text-emerald-600' : 'text-red-600', bg: net >= 0 ? 'bg-emerald-50' : 'bg-red-50' },
    ];

    const ifrsLinks = [
        { href: '/accounting/journal',              icon: BookOpen,  label: 'Journal Entries',  sub: 'General ledger' },
        { href: '/accounting/reports/profit-loss',  icon: TrendingUp,label: 'Profit & Loss',    sub: 'IFRS 15 · IAS 1' },
        { href: '/accounting/reports/balance-sheet',icon: Scale,     label: 'Balance Sheet',    sub: 'IAS 1' },
        { href: '/accounting/reports/cash-flows',   icon: Activity,  label: 'Cash Flows',       sub: 'IAS 7' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Accounting" />
            <div className="flex flex-col h-full">

                {/* ── SF record header ── */}
                <div className="bg-card border-b border-border shrink-0">
                    <div className="flex items-center justify-between px-6 py-3.5 border-b border-border/60">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                                <Receipt className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-base font-bold tracking-tight">Accounting</h1>
                                <p className="text-xs text-muted-foreground">
                                    IFRS-compliant double-entry · Billing & Payments
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" asChild>
                                <Link href="/follow-ups">
                                    <Bell className="h-3.5 w-3.5" /> Follow-ups
                                </Link>
                            </Button>
                            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" asChild>
                                <Link href="/client-reports">
                                    <BarChart3 className="h-3.5 w-3.5" /> Reports
                                </Link>
                            </Button>
                            <Button size="sm" className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90" asChild>
                                <Link href="/invoices/create">
                                    <FileText className="h-3.5 w-3.5" /> New Invoice
                                </Link>
                            </Button>
                        </div>
                    </div>

                    {/* KPI strip */}
                    <div className="flex divide-x divide-border/60">
                        {kpiCards.map(c => (
                            <div key={c.label} className="flex-1 px-5 py-2.5 flex items-center gap-2.5">
                                <div className={cn('h-7 w-7 rounded-md flex items-center justify-center shrink-0', c.bg)}>
                                    <c.icon className={cn('h-3.5 w-3.5', c.color)} />
                                </div>
                                <div>
                                    <p className={cn('text-lg font-bold tabular-nums leading-none', c.color)}>{c.value}</p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">{c.label}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Body ── */}
                <div className="flex-1 overflow-auto bg-background p-6 space-y-6">

                    {/* IFRS quick-link cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {ifrsLinks.map(item => (
                            <Link key={item.href} href={item.href}>
                                <div className="bg-card border border-border rounded-lg p-4 hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer group h-full">
                                    <item.icon className="h-5 w-5 text-muted-foreground mb-2 group-hover:text-primary transition-colors" />
                                    <p className="font-semibold text-sm group-hover:text-primary transition-colors">{item.label}</p>
                                    <p className="text-xs text-muted-foreground">{item.sub}</p>
                                </div>
                            </Link>
                        ))}
                    </div>

                    {/* Utility links row */}
                    <div className="flex gap-3 flex-wrap text-xs">
                        {[
                            { href: '/accounting/chart',                    icon: Layers,     label: 'Chart of Accounts' },
                            { href: '/accounting/reports/trial-balance',    icon: Scale,      label: 'Trial Balance' },
                            { href: '/accounting/fx',                       icon: RefreshCw,  label: 'Exchange Rates' },
                            { href: '/accounting/periods',                  icon: Bell,       label: 'Periods' },
                        ].map(l => (
                            <Link key={l.href} href={l.href}
                                className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
                                <l.icon className="h-3.5 w-3.5" />
                                {l.label}
                            </Link>
                        ))}
                    </div>

                    {/* Charts row */}
                    <div className="grid lg:grid-cols-3 gap-5">
                        {/* Revenue bar chart */}
                        <div className="lg:col-span-2 bg-card border border-border rounded-lg p-5">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="text-sm font-semibold">Monthly Revenue Collected</h2>
                                    <p className="text-xs text-muted-foreground mt-0.5">Last 6 months</p>
                                </div>
                            </div>
                            {chartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={180}>
                                    <BarChart data={chartData} barSize={24}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                                        <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                                        <Tooltip
                                            formatter={(v: number) => [fmt(v), 'Collected']}
                                            contentStyle={{ fontSize: 12, borderRadius: 8 }}
                                        />
                                        {/* Amber bar matching the design system primary */}
                                        <Bar dataKey="amount" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-44 flex items-center justify-center text-muted-foreground text-sm">
                                    No payment data yet
                                </div>
                            )}
                        </div>

                        {/* Invoice status breakdown */}
                        <div className="bg-card border border-border rounded-lg p-5">
                            <h2 className="text-sm font-semibold mb-4">Invoice Status</h2>
                            <div className="space-y-2.5">
                                {['draft', 'issued', 'paid', 'overdue', 'cancelled'].map(status => {
                                    const s = invoicesByStatus[status];
                                    if (!s) return null;
                                    return (
                                        <div key={status} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full ring-1 capitalize',
                                                    INV_STATUS_PILL[status] ?? INV_STATUS_PILL.draft)}>
                                                    {status}
                                                </span>
                                                <span className="text-xs text-muted-foreground">{s.count}</span>
                                            </div>
                                            <span className="text-sm font-medium tabular-nums">{fmt(s.total)}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Bottom three-column widgets */}
                    <div className="grid lg:grid-cols-3 gap-5">
                        {/* Overdue */}
                        <div className="bg-card border border-border rounded-lg p-5">
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-sm font-semibold flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4 text-red-500" /> Overdue
                                </h2>
                                <Button variant="ghost" size="sm" className="h-6 text-xs" asChild>
                                    <Link href="/invoices?status=overdue">All <ArrowRight className="h-3 w-3 ml-1" /></Link>
                                </Button>
                            </div>
                            <div className="space-y-1.5">
                                {overdueInvoices.length === 0
                                    ? <p className="text-sm text-muted-foreground text-center py-4">No overdue invoices 🎉</p>
                                    : overdueInvoices.map((inv: any) => (
                                        <Link key={inv.id} href={`/invoices/${inv.id}`}
                                            className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors">
                                            <div>
                                                <p className="text-sm font-medium font-mono">{inv.number}</p>
                                                <p className="text-xs text-muted-foreground">{inv.client?.name}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-semibold text-red-600">{fmt(inv.total, inv.currency)}</p>
                                                <p className="text-xs text-muted-foreground">Due {fmtDate(inv.due_date)}</p>
                                            </div>
                                        </Link>
                                    ))}
                            </div>
                        </div>

                        {/* Recent payments */}
                        <div className="bg-card border border-border rounded-lg p-5">
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-sm font-semibold flex items-center gap-2">
                                    <CreditCard className="h-4 w-4 text-emerald-500" /> Recent Payments
                                </h2>
                            </div>
                            <div className="space-y-3">
                                {recentPayments.length === 0
                                    ? <p className="text-sm text-muted-foreground text-center py-4">No payments recorded</p>
                                    : recentPayments.map((p: any) => (
                                        <div key={p.id} className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium">{p.invoice?.client?.name ?? '—'}</p>
                                                <p className="text-xs text-muted-foreground capitalize">{p.method} · {p.invoice?.number}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-semibold text-emerald-600">+{fmt(p.amount, p.currency)}</p>
                                                <p className="text-xs text-muted-foreground">{fmtDate(p.paid_at)}</p>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>

                        {/* Pending follow-ups */}
                        <div className="bg-card border border-border rounded-lg p-5">
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-sm font-semibold flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-amber-500" /> Follow-ups
                                </h2>
                                <Button variant="ghost" size="sm" className="h-6 text-xs" asChild>
                                    <Link href="/follow-ups">All <ArrowRight className="h-3 w-3 ml-1" /></Link>
                                </Button>
                            </div>
                            <div className="space-y-2">
                                {pendingFollowUps.length === 0
                                    ? <p className="text-sm text-muted-foreground text-center py-4">No pending follow-ups</p>
                                    : pendingFollowUps.map((f: any) => (
                                        <div key={f.id} className="flex items-start gap-2 p-2 rounded-md hover:bg-muted/50">
                                            <div className="h-2 w-2 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium truncate">{f.subject}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {f.client?.name} · {f.scheduled_at ? fmtDate(f.scheduled_at) : 'Unscheduled'}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>

                    {/* Recent invoices table */}
                    <div className="bg-card border border-border rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/30">
                            <h2 className="text-sm font-semibold">Recent Invoices</h2>
                            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" asChild>
                                <Link href="/invoices">View all <ArrowRight className="h-3 w-3" /></Link>
                            </Button>
                        </div>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-muted/20 border-b border-border">
                                    {['Invoice', 'Client', 'Project', 'Due', 'Amount', 'Status'].map(h => (
                                        <th key={h} className={cn(
                                            'px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground',
                                            h === 'Amount' && 'text-right',
                                            h === 'Status' && 'text-center',
                                        )}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {recentInvoices.map((inv: any) => (
                                    <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-5 py-2.5">
                                            <Link href={`/invoices/${inv.id}`} className="font-mono text-xs font-semibold text-primary hover:underline">
                                                {inv.number}
                                            </Link>
                                        </td>
                                        <td className="px-5 py-2.5 text-xs text-muted-foreground">{inv.client?.name ?? '—'}</td>
                                        <td className="px-5 py-2.5 text-xs text-muted-foreground">{inv.project?.name ?? '—'}</td>
                                        <td className="px-5 py-2.5 text-xs text-muted-foreground">{inv.due_date ? fmtDate(inv.due_date) : '—'}</td>
                                        <td className="px-5 py-2.5 text-right text-xs font-semibold tabular-nums">{fmt(inv.total, inv.currency)}</td>
                                        <td className="px-5 py-2.5 text-center">
                                            <span className={cn('inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ring-1 capitalize',
                                                INV_STATUS_PILL[inv.status] ?? INV_STATUS_PILL.draft)}>
                                                {inv.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {recentInvoices.length === 0 && (
                                    <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-muted-foreground">
                                        No invoices yet.{' '}
                                        <Link href="/invoices/create" className="text-primary hover:underline">Create your first invoice</Link>
                                    </td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
/**
 * reports/index.tsx — Amber Obsidian redesign
 *
 * All recharts components, data props, and router.get() calls are preserved
 * exactly. Changes:
 *  - SF record header replaces plain h1
 *  - Period selector converted to an amber underline tab bar in the header
 *  - KpiCard: icon bg uses primary/10 with amber icon, cards use bg-card border
 *  - Chart bar/line colours updated: primary bars #F59E0B (amber), secondary #22c55e
 *  - SectionTitle: amber icon badge
 *  - Conversion funnel: amber fill gradient
 */
import AppLayout from '@/layouts/app-layout';
import { Head, router, usePage } from '@inertiajs/react';
import { type BreadcrumbItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
    TrendingUp, TrendingDown, Users, Target, DollarSign, FolderOpen,
    BarChart2, CheckCircle, XCircle, Layers, Calendar, BarChart3,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Reports', href: '/reports' }];

const fmt = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000   ? `${(n / 1_000).toFixed(1)}K`
    : String(n);

const fmtCurrency = (n: number, currency = 'USD') =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);

// Amber-first palette keeping the rest harmonious
const PALETTE = ['#F59E0B', '#22c55e', '#6366f1', '#ef4444', '#3b82f6', '#a855f7', '#14b8a6', '#f97316'];

// ── Custom tooltip ────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-lg border border-border bg-card p-3 shadow-lg text-xs">
            {label && <p className="mb-1.5 font-semibold text-foreground">{label}</p>}
            {payload.map((p: any, i: number) => (
                <div key={i} className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: p.fill ?? p.color }} />
                    <span className="text-muted-foreground">{p.name ?? p.dataKey}:</span>
                    <span className="font-medium">{p.value}</span>
                </div>
            ))}
        </div>
    );
};

// ── KPI card ──────────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, trend }: {
    icon: React.ElementType; label: string; value: string | number; sub?: string; trend?: number;
}) {
    return (
        <div className="bg-card border border-border rounded-lg p-5">
            <div className="flex items-start justify-between">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-primary" />
                </div>
                {trend !== undefined && (
                    <span className={cn('flex items-center gap-1 text-xs font-semibold',
                        trend >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                        {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {Math.abs(trend)}%
                    </span>
                )}
            </div>
            <div className="mt-3">
                <p className="text-2xl font-bold tabular-nums tracking-tight">{value}</p>
                <p className="text-xs font-medium text-muted-foreground mt-0.5">{label}</p>
                {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
            </div>
        </div>
    );
}

// ── Section heading ───────────────────────────────────────────────────────────
function SectionTitle({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description?: string }) {
    return (
        <div className="flex items-center gap-3 mb-4">
            <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                <Icon className="h-4 w-4 text-primary" />
            </div>
            <div>
                <h2 className="text-sm font-bold uppercase tracking-wider">{title}</h2>
                {description && <p className="text-xs text-muted-foreground">{description}</p>}
            </div>
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ReportsIndex() {
    const {
        period, leadSummary, leadsByStatus, leadsBySource, leadsOverTime,
        opportunitySummary, opportunitiesByStage,
        projectSummary, projectsByStatus, conversionFunnel,
    } = usePage<any>().props;

    const [activePeriod, setActivePeriod] = useState<string>(period ?? '30');

    const handlePeriodChange = (p: string) => {
        setActivePeriod(p);
        router.get('/reports', { period: p }, { preserveState: true, replace: true });
    };

    const periods = [
        { value: '7',   label: '7 days' },
        { value: '30',  label: '30 days' },
        { value: '90',  label: '90 days' },
        { value: '365', label: '1 year' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Reports" />
            <div className="flex flex-col h-full">

                {/* SF header */}
                <div className="bg-card border-b border-border shrink-0">
                    <div className="flex items-center justify-between px-6 py-3.5 border-b border-border/60">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                                <BarChart3 className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-base font-bold tracking-tight">Reports</h1>
                                <p className="text-xs text-muted-foreground">
                                    Leads, opportunities and projects — last {activePeriod} days
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Period selector as amber tab bar */}
                    <div className="flex items-center px-4">
                        {periods.map(p => (
                            <button key={p.value} onClick={() => handlePeriodChange(p.value)}
                                className={cn(
                                    'px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-colors',
                                    activePeriod === p.value ? 'sf-tab-active' : 'sf-tab-inactive'
                                )}>
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Scrollable body */}
                <div className="flex-1 overflow-auto bg-background p-6 space-y-10">

                    {/* ── LEADS ── */}
                    <section>
                        <SectionTitle icon={Users} title="Leads"
                            description={`Key metrics for the last ${activePeriod} days`} />

                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-5">
                            <KpiCard icon={Users}       label="Total Leads"     value={leadSummary.total}
                                sub={`+${leadSummary.new_in_period} new this period`} />
                            <KpiCard icon={CheckCircle} label="Won"             value={leadSummary.won} />
                            <KpiCard icon={XCircle}     label="Lost"            value={leadSummary.lost} />
                            <KpiCard icon={Target}      label="Conversion Rate" value={`${leadSummary.conversion_rate}%`} />
                        </div>

                        <div className="grid gap-5 lg:grid-cols-3">
                            <Card className="lg:col-span-2">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm">New Leads Over Time</CardTitle>
                                    <CardDescription className="text-xs">Leads created in the selected period</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={200}>
                                        <LineChart data={leadsOverTime} margin={{ top: 4, right: 16, left: -20, bottom: 4 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                            <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                                            <YAxis tick={{ fontSize: 11 }} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Line type="monotone" dataKey="count" name="Leads"
                                                stroke="#F59E0B" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm">By Status</CardTitle>
                                    <CardDescription className="text-xs">Current distribution</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={200}>
                                        <PieChart>
                                            <Pie data={leadsByStatus} dataKey="count" nameKey="label"
                                                cx="50%" cy="50%" outerRadius={72} innerRadius={36}>
                                                {leadsByStatus.map((_: any, i: number) => (
                                                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<CustomTooltip />} />
                                            <Legend iconType="circle" iconSize={8} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        </div>

                        <Card className="mt-5">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm">By Source</CardTitle>
                                <CardDescription className="text-xs">Where leads are coming from</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={180}>
                                    <BarChart data={leadsBySource} margin={{ top: 4, right: 16, left: -20, bottom: 4 }} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                                        <XAxis type="number" tick={{ fontSize: 11 }} />
                                        <YAxis dataKey="source" type="category" tick={{ fontSize: 11 }} width={100} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Bar dataKey="count" name="Leads" fill="#F59E0B" radius={[0, 4, 4, 0]} maxBarSize={18} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </section>

                    {/* ── OPPORTUNITIES ── */}
                    <section>
                        <SectionTitle icon={DollarSign} title="Opportunities" description="Sales pipeline overview" />

                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-5">
                            <KpiCard icon={Layers}      label="Total Opportunities" value={opportunitySummary.total} />
                            <KpiCard icon={CheckCircle} label="Won"                 value={opportunitySummary.won} />
                            <KpiCard icon={Target}      label="Win Rate"            value={`${opportunitySummary.conversion_rate}%`} />
                            <KpiCard icon={DollarSign}  label="Won Value"           value={fmtCurrency(opportunitySummary.won_value)} />
                        </div>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm">Pipeline by Stage</CardTitle>
                                <CardDescription className="text-xs">Count and estimated value per stage</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={220}>
                                    <BarChart data={opportunitiesByStage} margin={{ top: 4, right: 16, left: -10, bottom: 4 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                                        <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 11 }} />
                                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }}
                                            tickFormatter={(v) => fmt(v)} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend />
                                        <Bar yAxisId="left"  dataKey="count" name="Count"      fill="#F59E0B" radius={[4,4,0,0]} maxBarSize={36} />
                                        <Bar yAxisId="right" dataKey="value" name="Value ($)"  fill="#22c55e" radius={[4,4,0,0]} maxBarSize={36} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </section>

                    {/* ── PROJECTS ── */}
                    <section>
                        <SectionTitle icon={FolderOpen} title="Projects" description="Delivery and execution status" />

                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-5">
                            <KpiCard icon={FolderOpen}  label="Total Projects" value={projectSummary.total} />
                            <KpiCard icon={CheckCircle} label="Active"         value={projectSummary.active} />
                            <KpiCard icon={CheckCircle} label="Completed"      value={projectSummary.completed} />
                            <KpiCard icon={Calendar}    label="Overdue"        value={projectSummary.overdue} />
                        </div>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm">Projects by Status</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={180}>
                                    <BarChart data={projectsByStatus} margin={{ top: 4, right: 16, left: -20, bottom: 4 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                        <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                                        <YAxis tick={{ fontSize: 11 }} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Bar dataKey="count" name="Projects" radius={[4,4,0,0]} maxBarSize={52}>
                                            {projectsByStatus.map((_: any, i: number) => (
                                                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </section>

                    {/* ── CONVERSION FUNNEL ── */}
                    <section>
                        <SectionTitle icon={BarChart2} title="Conversion Funnel"
                            description="How leads progress through the pipeline" />

                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-4">
                                    {conversionFunnel.map((step: any, i: number) => {
                                        const maxCount = conversionFunnel[0]?.count || 1;
                                        const pct = Math.round((step.count / maxCount) * 100);
                                        return (
                                            <div key={i} className="flex flex-1 flex-col items-center gap-2">
                                                <span className="text-sm font-bold">{step.count}</span>
                                                <div
                                                    className="w-full rounded-t-lg transition-all"
                                                    style={{
                                                        height: `${Math.max(pct * 1.8, 24)}px`,
                                                        background: PALETTE[i % PALETTE.length],
                                                        opacity: 1 - i * 0.1,
                                                    }}
                                                />
                                                <div className="text-center">
                                                    <p className="text-xs font-semibold">{step.label}</p>
                                                    {i > 0 && (
                                                        <span className="text-[10px] font-medium text-muted-foreground">
                                                            {pct}%
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </section>

                </div>
            </div>
        </AppLayout>
    );
}
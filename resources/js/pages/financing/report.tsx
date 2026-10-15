import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { type BreadcrumbItem } from '@/types';
import {
    TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
    Download, Clock, Users, FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Accounting', href: '/accounting' },
    { title: 'Financing Report', href: '/financing/report' },
];

interface AgedBucket {
    label: string;
    total: number;
    invoices: Array<{ number: string; client: string | null; amount_due: number; days_past_due: number; due_date: string }>;
}

interface Report {
    generated_at: string;
    functional_currency: string;
    summary: {
        total_outstanding: number;
        eligible_receivables: number;
        dso_days: number;
        collection_efficiency: number;
        financing_score: number;
        score_label: string;
        estimated_facility: number;
        advance_rate_pct: number;
    };
    aged_receivables: Record<string, AgedBucket>;
    debtor_concentration: Array<{ client_name: string; total_due: number; pct_of_book: number; invoice_count: number }>;
    payment_behaviour: Array<{ client_name: string; invoice_count: number; avg_days_to_pay: number; total_paid: number; pays_on_time: boolean }>;
    recommendations: string[];
}

interface Props { report: Report }

const fmt = (n: number, c = 'KES') =>
    new Intl.NumberFormat('en-KE', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(n);

function ScoreGauge({ score, label }: { score: number; label: string }) {
    const color =
        score >= 80 ? 'text-emerald-600' :
        score >= 65 ? 'text-blue-600' :
        score >= 50 ? 'text-amber-600' :
        score >= 35 ? 'text-orange-600' : 'text-red-600';

    const bar =
        score >= 80 ? 'bg-emerald-500' :
        score >= 65 ? 'bg-blue-500' :
        score >= 50 ? 'bg-amber-500' :
        score >= 35 ? 'bg-orange-500' : 'bg-red-500';

    return (
        <div className="text-center space-y-2">
            <p className={cn('text-5xl font-black tabular-nums', color)}>{score}</p>
            <p className={cn('text-sm font-bold', color)}>{label}</p>
            <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                <div className={cn('h-full rounded-full transition-all', bar)} style={{ width: `${score}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">Financing Readiness Score / 100</p>
        </div>
    );
}

export default function FinancingReport({ report }: Props) {
    const { summary, aged_receivables, debtor_concentration, payment_behaviour, recommendations } = report;

    const agedBuckets = [
        { key: '0_30',   data: aged_receivables['0_30'] },
        { key: '31_60',  data: aged_receivables['31_60'] },
        { key: '61_90',  data: aged_receivables['61_90'] },
        { key: '90plus', data: aged_receivables['90plus'] },
    ];

    const totalOutstanding = summary.total_outstanding;
    const agedColors = ['bg-emerald-500', 'bg-amber-400', 'bg-orange-500', 'bg-red-600'];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Invoice Financing Report" />
            <div className="space-y-6 p-6 max-w-5xl">

                {/* Header */}
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-lg font-bold">Invoice Financing Readiness</h1>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Report generated {new Date(report.generated_at).toLocaleDateString('en-KE', { dateStyle: 'long' })}
                        </p>
                    </div>
                    <Button size="sm" variant="outline" className="gap-1.5"
                        onClick={() => window.open('/financing/export', '_blank')}>
                        <Download className="h-3.5 w-3.5" /> Export JSON (for lenders)
                    </Button>
                </div>

                {/* Score + key metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="bg-card border border-border rounded-xl p-6">
                        <ScoreGauge score={summary.financing_score} label={summary.score_label} />
                    </div>
                    <div className="md:col-span-2 grid grid-cols-2 gap-3">
                        {[
                            { label: 'Total Outstanding',    value: fmt(summary.total_outstanding, report.functional_currency), icon: FileText, note: 'Across all open invoices' },
                            { label: 'Eligible Receivables', value: fmt(summary.eligible_receivables, report.functional_currency), icon: CheckCircle2, note: '0–60 day invoices only' },
                            { label: 'DSO',                  value: `${summary.dso_days} days`, icon: Clock, note: '90-day rolling average' },
                            { label: 'Collection Efficiency',value: `${summary.collection_efficiency}%`, icon: TrendingUp, note: 'Collected vs billed (90d)' },
                        ].map(card => (
                            <div key={card.label} className="bg-card border border-border rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <card.icon className="h-3.5 w-3.5 text-muted-foreground" />
                                    <p className="text-xs text-muted-foreground">{card.label}</p>
                                </div>
                                <p className="text-xl font-bold">{card.value}</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">{card.note}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Estimated facility */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 dark:bg-amber-950/20 dark:border-amber-800">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">Estimated Financing Facility</p>
                            <p className="text-3xl font-black text-amber-800 dark:text-amber-200 mt-1">
                                {fmt(summary.estimated_facility, report.functional_currency)}
                            </p>
                            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                                Based on {summary.advance_rate_pct}% advance rate on {fmt(summary.eligible_receivables, report.functional_currency)} eligible receivables
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-amber-700 dark:text-amber-400">Share this report with:</p>
                            <div className="flex flex-wrap gap-1.5 mt-1.5 justify-end">
                                {['Pezesha', 'Stanbic IF', 'KCB Discount', 'LPO Finance'].map(lender => (
                                    <span key={lender} className="text-xs font-medium px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200">
                                        {lender}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Aged receivables waterfall */}
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-border bg-muted/30">
                        <p className="text-sm font-semibold">Aged Receivables</p>
                    </div>
                    <div className="p-5 space-y-4">
                        {/* Stacked bar */}
                        {totalOutstanding > 0 && (
                            <div className="flex h-6 rounded-full overflow-hidden gap-px">
                                {agedBuckets.map(({ key, data }, i) => {
                                    const pct = data.total / totalOutstanding * 100;
                                    return pct > 0 ? (
                                        <div key={key} title={`${data.label}: ${pct.toFixed(1)}%`}
                                            className={cn('h-full transition-all', agedColors[i])}
                                            style={{ width: `${pct}%` }} />
                                    ) : null;
                                })}
                            </div>
                        )}

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {agedBuckets.map(({ key, data }, i) => (
                                <div key={key} className="space-y-1">
                                    <div className="flex items-center gap-1.5">
                                        <div className={cn('w-2.5 h-2.5 rounded-full', agedColors[i])} />
                                        <p className="text-xs font-medium">{data.label}</p>
                                    </div>
                                    <p className="text-lg font-bold">{fmt(data.total, report.functional_currency)}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {data.invoices.length} invoice{data.invoices.length !== 1 ? 's' : ''}
                                        {totalOutstanding > 0 && ` · ${(data.total / totalOutstanding * 100).toFixed(1)}%`}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Debtor concentration */}
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-border bg-muted/30 flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm font-semibold">Debtor Concentration (Top 10)</p>
                    </div>
                    <div className="divide-y divide-border">
                        {debtor_concentration.slice(0, 10).map((d, i) => (
                            <div key={i} className="px-5 py-3 flex items-center gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium truncate">{d.client_name}</p>
                                        {d.pct_of_book >= 25 && (
                                            <span className="text-xs text-amber-600 flex items-center gap-0.5">
                                                <AlertTriangle className="h-3 w-3" /> Concentrated
                                            </span>
                                        )}
                                    </div>
                                    <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                        <div className={cn('h-full rounded-full', d.pct_of_book >= 25 ? 'bg-amber-500' : 'bg-blue-500')}
                                            style={{ width: `${Math.min(100, d.pct_of_book)}%` }} />
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-sm font-bold">{fmt(d.total_due, report.functional_currency)}</p>
                                    <p className="text-xs text-muted-foreground">{d.pct_of_book}% of book · {d.invoice_count} inv</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Payment behaviour */}
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-border bg-muted/30">
                        <p className="text-sm font-semibold">Client Payment Behaviour</p>
                    </div>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-muted/20">
                                {['Client', 'Invoices', 'Avg Days to Pay', 'Total Paid', 'Behaviour'].map(h => (
                                    <th key={h} className="text-left px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {payment_behaviour.map((pb, i) => (
                                <tr key={i} className="hover:bg-muted/10">
                                    <td className="px-4 py-2.5 font-medium">{pb.client_name}</td>
                                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{pb.invoice_count}</td>
                                    <td className="px-4 py-2.5">
                                        <span className={cn('text-xs font-semibold',
                                            pb.avg_days_to_pay <= 0 ? 'text-emerald-600' :
                                            pb.avg_days_to_pay <= 14 ? 'text-amber-600' : 'text-red-600')}>
                                            {pb.avg_days_to_pay > 0 ? `+${pb.avg_days_to_pay}d late` : `${Math.abs(pb.avg_days_to_pay)}d early`}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2.5 text-xs font-mono">{fmt(pb.total_paid, report.functional_currency)}</td>
                                    <td className="px-4 py-2.5">
                                        {pb.pays_on_time
                                            ? <span className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Reliable</span>
                                            : <span className="text-xs text-amber-600 flex items-center gap-1"><Clock className="h-3 w-3" /> Slow payer</span>
                                        }
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Recommendations */}
                {recommendations.length > 0 && (
                    <div className="bg-card border border-border rounded-xl p-5 space-y-3">
                        <p className="text-sm font-semibold">Recommendations to Improve Your Score</p>
                        {recommendations.map((rec, i) => (
                            <div key={i} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                                <TrendingUp className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                                <p className="text-sm">{rec}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
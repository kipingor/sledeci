import AppLayout from '@/layouts/app-layout';
import { Head, Link } from '@inertiajs/react';
import { type BreadcrumbItem } from '@/types';
import { Activity, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Leads', href: '/leads' },
    { title: 'Pipeline Health', href: '/ai/pipeline-health' },
];

interface Props {
    average_score: number;
    total_leads: number;
    distribution: {
        high_quality: number;
        medium_quality: number;
        low_quality: number;
    };
    health_status: string;
}

const STATUS: Record<string, { label: string; className: string; icon: typeof CheckCircle2 }> = {
    excellent: { label: 'Excellent', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200', icon: CheckCircle2 },
    good: { label: 'Good', className: 'bg-sky-50 text-sky-700 ring-sky-200', icon: TrendingUp },
    fair: { label: 'Fair', className: 'bg-amber-50 text-amber-700 ring-amber-200', icon: Activity },
    needs_attention: { label: 'Needs attention', className: 'bg-orange-50 text-orange-700 ring-orange-200', icon: AlertTriangle },
    critical: { label: 'Critical', className: 'bg-red-50 text-red-700 ring-red-200', icon: AlertTriangle },
};

export default function PipelineHealth({ average_score, total_leads, distribution, health_status }: Props) {
    const status = STATUS[health_status] ?? STATUS.fair;
    const Icon = status.icon;
    const total = Math.max(total_leads, 1);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Pipeline Health" />
            <div className="space-y-6 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-lg font-bold flex items-center gap-2">
                            <Activity className="h-5 w-5 text-violet-500" />
                            Pipeline Health
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            AI quality score across your leads (heuristic scoring).
                        </p>
                    </div>
                    <Link href="/leads" className="text-sm text-primary hover:underline">
                        Back to leads
                    </Link>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-xl border bg-card p-5">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Average score</p>
                        <p className="mt-2 text-3xl font-bold tabular-nums">{average_score}</p>
                        <p className="text-xs text-muted-foreground mt-1">out of 100</p>
                    </div>
                    <div className="rounded-xl border bg-card p-5">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Leads scored</p>
                        <p className="mt-2 text-3xl font-bold tabular-nums">{total_leads}</p>
                        <p className="text-xs text-muted-foreground mt-1">latest 500 max</p>
                    </div>
                    <div className="rounded-xl border bg-card p-5">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</p>
                        <div className={cn('mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ring-1', status.className)}>
                            <Icon className="h-4 w-4" />
                            {status.label}
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border bg-card p-5 space-y-4">
                    <h2 className="text-sm font-semibold">Quality distribution</h2>
                    {(
                        [
                            { key: 'high_quality', label: 'High (≥ 80)', color: 'bg-emerald-500', count: distribution.high_quality },
                            { key: 'medium_quality', label: 'Medium (60–79)', color: 'bg-amber-500', count: distribution.medium_quality },
                            { key: 'low_quality', label: 'Low (< 60)', color: 'bg-red-500', count: distribution.low_quality },
                        ] as const
                    ).map((row) => (
                        <div key={row.key}>
                            <div className="flex justify-between text-sm mb-1">
                                <span>{row.label}</span>
                                <span className="tabular-nums text-muted-foreground">
                                    {row.count} ({Math.round((row.count / total) * 100)}%)
                                </span>
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                                <div
                                    className={cn('h-full rounded-full', row.color)}
                                    style={{ width: `${Math.min(100, (row.count / total) * 100)}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </AppLayout>
    );
}

import AppLayout from '@/layouts/app-layout';
import { Head, usePage } from '@inertiajs/react';
import { Link } from '@inertiajs/react';
import { type BreadcrumbItem } from '@/types';
import PipelineBoard from '@/components/pipeline/pipeline-board';
import useLeadsRealtime from '@/hooks/use-leads';
import { Columns, Plus, TrendingUp, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Pipeline', href: '/pipelines' }];

const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'KES', notation: 'compact', maximumFractionDigits: 0 }).format(n);

export default function PipelineIndex() {
    useLeadsRealtime();

    const { props } = usePage<any>();
    const stages        = props.stages ?? [];
    const leadsByStage  = props.leadsByStage ?? {};
    const metrics       = props.metrics ?? { totalLeads: 0, totalValue: 0, conversionRate: 0 };

    const totalLeads = stages.reduce((n: number, s: any) => {
        const count = Array.isArray(leadsByStage[s.key]) ? leadsByStage[s.key].length : 0;
        return n + count;
    }, 0);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Pipeline" />
            <div className="flex flex-col h-full">

                {/* ── SF record header ── */}
                <div className="bg-card border-b border-border shrink-0">
                    <div className="flex items-center justify-between px-6 py-3.5 border-b border-border/60">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                                <Columns className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-base font-bold tracking-tight">Pipeline</h1>
                                <p className="text-xs text-muted-foreground">
                                    {stages.length} stage{stages.length !== 1 ? 's' : ''} · {totalLeads} leads
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Live
                            </div>
                            <Button
                                size="sm"
                                className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                                asChild
                            >
                                <Link href="/leads/create">
                                    <Plus className="h-3.5 w-3.5" /> New Lead
                                </Link>
                            </Button>
                        </div>
                    </div>

                    {/* Stats strip */}
                    <div className="flex divide-x divide-border/60">
                        {[
                            { label: 'Total Leads',    value: metrics.totalLeads ?? totalLeads, icon: LayoutGrid,  color: 'text-foreground' },
                            { label: 'Pipeline Value', value: fmt(metrics.totalValue ?? 0),     icon: TrendingUp,  color: 'text-emerald-700' },
                            { label: 'Conversion',     value: `${metrics.conversionRate ?? 0}%`, icon: TrendingUp,  color: 'text-primary' },
                        ].map(s => (
                            <div key={s.label} className="flex-1 px-5 py-2.5 flex items-center gap-2.5">
                                <s.icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <div>
                                    <p className={cn('text-lg font-bold tabular-nums leading-none', s.color)}>{s.value}</p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Board fills remaining height ── */}
                <div className="flex-1 overflow-hidden">
                    <PipelineBoard stages={stages} leadsByStage={leadsByStage} />
                </div>
            </div>
        </AppLayout>
    );
}
/**
 * accounting/client-report-show.tsx — Amber Obsidian redesign
 * router.post/delete and confirm() preserved exactly.
 */
import AppLayout from '@/layouts/app-layout';
import { Head, router, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { type BreadcrumbItem } from '@/types';
import { Send, Trash2, ArrowLeft, CheckCircle2, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const STATUS_PILL: Record<string, string> = {
    draft:  'bg-slate-50 text-slate-600 ring-slate-200',
    sent:   'bg-blue-50 text-blue-700 ring-blue-200',
    viewed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
};

const fmtDate = (d: string) => format(new Date(d), 'MMMM d, yyyy');
const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

function renderContent(text: string) {
    return text
        .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold mt-4 mb-1">$1</h3>')
        .replace(/^## (.+)$/gm,  '<h2 class="text-lg font-semibold mt-5 mb-2">$1</h2>')
        .replace(/^# (.+)$/gm,   '<h1 class="text-xl font-bold mt-6 mb-2">$1</h1>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
        .replace(/^---$/gm, '<hr class="my-4 border-border" />')
        .replace(/\n\n/g, '</p><p class="mb-3">')
        .replace(/\n/g, '<br/>');
}

interface Props {
    report: {
        id: number; title: string; status: string; period_type: string;
        period_start: string; period_end: string; content: string; metrics: any;
        sent_at: string | null; viewed_at: string | null;
        client:  { id: number; name: string; email: string } | null;
        project: { id: number; name: string } | null;
        creator: { id: number; name: string } | null;
        created_at: string;
    };
}

export default function ClientReportShow({ report }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Accounting',      href: '/accounting' },
        { title: 'Client Reports',  href: '/client-reports' },
        { title: report.title,      href: `/client-reports/${report.id}` },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={report.title} />
            <div className="flex flex-col h-full">

                {/* SF record header */}
                <div className="bg-card border-b border-border">
                    <div className="px-6 pt-5 pb-4">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3 min-w-0">
                                <Link href="/client-reports"
                                    className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground shrink-0">
                                    <ArrowLeft className="h-4 w-4" />
                                </Link>
                                <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                                    <BarChart3 className="h-5 w-5 text-primary" />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2.5 flex-wrap">
                                        <h1 className="text-xl font-bold tracking-tight truncate">{report.title}</h1>
                                        <span className={cn('inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full ring-1 capitalize',
                                            STATUS_PILL[report.status] ?? STATUS_PILL.draft)}>
                                            {report.status}
                                        </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-0.5">
                                        {report.client?.name} · {fmtDate(report.period_start)} – {fmtDate(report.period_end)}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                {report.status === 'draft' && (
                                    <Button size="sm" className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                                        onClick={() => {
                                            if (confirm('Mark as sent to client?'))
                                                router.post(`/client-reports/${report.id}/send`, {}, { preserveScroll: true });
                                        }}>
                                        <Send className="h-3.5 w-3.5" /> Mark as Sent
                                    </Button>
                                )}
                                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive/90 h-8 w-8 p-0"
                                    onClick={() => {
                                        if (confirm('Delete this report?')) router.delete(`/client-reports/${report.id}`);
                                    }}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-auto bg-background p-6">
                    <div className="max-w-4xl mx-auto grid lg:grid-cols-3 gap-5">

                        {/* Content */}
                        <div className="lg:col-span-2">
                            <div className="bg-card border border-border rounded-lg p-8">
                                <div
                                    className="prose prose-sm max-w-none text-foreground leading-relaxed"
                                    dangerouslySetInnerHTML={{ __html: `<p class="mb-3">${renderContent(report.content)}</p>` }}
                                />
                            </div>
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-4">
                            {/* Report info */}
                            <div className="bg-card border border-border rounded-lg p-4 space-y-2.5 text-sm">
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Report Info</h3>
                                {[
                                    { label: 'Client',  value: report.client?.name ?? '—' },
                                    ...(report.project ? [{ label: 'Project', value: report.project.name }] : []),
                                    { label: 'Period',  value: report.period_type.charAt(0).toUpperCase() + report.period_type.slice(1) },
                                    { label: 'Created', value: fmtDate(report.created_at) },
                                ].map(d => (
                                    <div key={d.label} className="flex justify-between">
                                        <span className="text-muted-foreground">{d.label}</span>
                                        <span className="font-medium">{d.value}</span>
                                    </div>
                                ))}
                                {report.sent_at && (
                                    <div className="flex justify-between text-blue-600 font-medium">
                                        <span>Sent</span><span>{fmtDate(report.sent_at)}</span>
                                    </div>
                                )}
                                {report.viewed_at && (
                                    <div className="flex items-center justify-between text-emerald-600 font-medium">
                                        <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" />Viewed</span>
                                        <span>{fmtDate(report.viewed_at)}</span>
                                    </div>
                                )}
                            </div>

                            {/* Metrics */}
                            {report.metrics && (
                                <div className="bg-card border border-border rounded-lg p-4 text-sm">
                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Metrics Snapshot</h3>
                                    <div className="space-y-2">
                                        <div className="flex justify-between"><span className="text-muted-foreground">Invoices paid</span><span>{report.metrics.invoices_paid}/{report.metrics.invoices_total}</span></div>
                                        <div className="flex justify-between"><span className="text-muted-foreground">Total billed</span><span className="font-medium">{fmt(report.metrics.billed)}</span></div>
                                        <div className="flex justify-between"><span className="text-muted-foreground">Collected</span><span className="font-medium text-emerald-600">{fmt(report.metrics.collected)}</span></div>
                                        {report.metrics.outstanding > 0 && (
                                            <div className="flex justify-between"><span className="text-muted-foreground">Outstanding</span><span className="font-medium text-red-600">{fmt(report.metrics.outstanding)}</span></div>
                                        )}
                                        {report.metrics.projects?.map((p: any) => (
                                            <div key={p.id} className="border-t border-border pt-2 mt-2">
                                                <p className="font-medium text-xs mb-1">{p.name}</p>
                                                <div className="flex justify-between text-xs"><span className="text-muted-foreground">Tasks</span><span>{p.tasks_done}/{p.tasks_total}</span></div>
                                                <div className="flex justify-between text-xs"><span className="text-muted-foreground">Hours</span><span>{p.hours_spent}h/{p.hours_estimated}h</span></div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
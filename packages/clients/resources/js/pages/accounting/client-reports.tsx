/**
 * accounting/client-reports.tsx — Amber Obsidian redesign
 * All router.post/delete and confirm dialog logic preserved exactly.
 * (confirm() was already replaced with useDeleteConfirmation in the original)
 */
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { type BreadcrumbItem } from '@/types';
import { Plus, Send, Trash2, Eye, BarChart3 } from 'lucide-react';
import { useDeleteConfirmation } from '@/components/ui/confirm-dialog';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Accounting', href: '/accounting' },
    { title: 'Client Reports', href: '/client-reports' },
];

const STATUS_PILL: Record<string, string> = {
    draft:  'bg-slate-50 text-slate-600 ring-slate-200',
    sent:   'bg-blue-50 text-blue-700 ring-blue-200',
    viewed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
};
const PERIOD_LABELS: Record<string, string> = {
    weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', custom: 'Custom',
};

interface Props {
    reports:  { data: any[]; current_page: number; last_page: number; total: number };
    clients:  { id: number; name: string }[];
    projects: { id: number; name: string }[];
}

export default function ClientReports({ reports, clients, projects }: Props) {
    const { confirmDelete, ConfirmDialog } = useDeleteConfirmation();

    const handleSend = async (reportId: number) => {
        await confirmDelete({
            itemName: 'Mark as Sent',
            customDescription: 'This will mark the report as sent to the client.',
            onConfirm: async () => {
                router.post(`/client-reports/${reportId}/send`, {}, { preserveScroll: true });
            },
        });
    };

    const handleDelete = async (reportId: number, title: string) => {
        await confirmDelete({
            itemName: title,
            onConfirm: async () => {
                router.delete(`/client-reports/${reportId}`, { preserveScroll: true });
            },
        });
    };

    const fmtD = (d: string) => format(new Date(d), 'MMM d, yyyy');

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Client Reports" />
            <div className="flex flex-col h-full">

                {/* SF header */}
                <div className="bg-card border-b border-border">
                    <div className="flex items-center justify-between px-6 py-3.5">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                                <BarChart3 className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-base font-bold tracking-tight">Client Reports</h1>
                                <p className="text-xs text-muted-foreground">Weekly, monthly &amp; quarterly client summaries</p>
                            </div>
                        </div>
                        <Button size="sm" className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90" asChild>
                            <Link href="/client-reports/create">
                                <Plus className="h-3.5 w-3.5" /> New Report
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto bg-background p-5">
                    {reports.data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                            <BarChart3 className="h-10 w-10 mb-3 opacity-20" />
                            <p className="font-medium">No client reports yet</p>
                            <p className="text-sm mt-1">Create your first report to keep clients informed.</p>
                            <Button size="sm" className="mt-4" asChild>
                                <Link href="/client-reports/create">Create Report</Link>
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-2 max-w-3xl">
                            {reports.data.map((r: any) => (
                                <div key={r.id} className="bg-card border border-border rounded-lg p-4 hover:border-primary/30 transition-colors">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <Link href={`/client-reports/${r.id}`}
                                                    className="font-semibold text-sm hover:text-primary transition-colors">
                                                    {r.title}
                                                </Link>
                                                <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full ring-1 capitalize',
                                                    STATUS_PILL[r.status] ?? STATUS_PILL.draft)}>
                                                    {r.status}
                                                </span>
                                                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted ring-1 ring-border text-muted-foreground">
                                                    {PERIOD_LABELS[r.period_type] ?? r.period_type}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                                                <span className="font-medium text-foreground">{r.client?.name}</span>
                                                {r.project && <span>· {r.project.name}</span>}
                                                <span>· {fmtD(r.period_start)} – {fmtD(r.period_end)}</span>
                                                {r.sent_at   && <span className="text-blue-600">· Sent {fmtD(r.sent_at)}</span>}
                                                {r.viewed_at && <span className="text-emerald-600">· Viewed {fmtD(r.viewed_at)}</span>}
                                            </div>
                                            {r.metrics && (
                                                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                                    {r.metrics.invoices_total > 0 && (
                                                        <span>{r.metrics.invoices_paid}/{r.metrics.invoices_total} invoices paid</span>
                                                    )}
                                                    {r.metrics.billed > 0 && (
                                                        <span>Billed: ${Number(r.metrics.billed).toLocaleString()}</span>
                                                    )}
                                                    {r.metrics.outstanding > 0 && (
                                                        <span className="text-red-600 font-medium">Outstanding: ${Number(r.metrics.outstanding).toLocaleString()}</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" asChild>
                                                <Link href={`/client-reports/${r.id}`}>
                                                    <Eye className="h-3.5 w-3.5" />
                                                </Link>
                                            </Button>
                                            {r.status === 'draft' && (
                                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700"
                                                    onClick={() => handleSend(r.id)}>
                                                    <Send className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                                onClick={() => handleDelete(r.id, r.title)}>
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <ConfirmDialog />
        </AppLayout>
    );
}
/**
 * FIXES:
 * 1. confirm('Mark this report as sent?') — native browser dialog, no branding/UX consistency.
 *    Replaced with useConfirmDialog hook from the project's own ConfirmDialog component.
 * 2. confirm('Delete this report?') — same fix.
 * The router.post/delete calls to web routes are correct and unchanged.
 */

import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { type BreadcrumbItem } from '@/types';
import { Plus, Send, Trash2, Eye, BarChart3 } from 'lucide-react';
import { useDeleteConfirmation, useConfirmDialog } from '@/components/ui/confirm-dialog';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Accounting', href: '/accounting' },
    { title: 'Client Reports', href: '/client-reports' },
];
const STATUS_COLORS: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    sent:  'bg-blue-100 text-blue-700',
    viewed:'bg-green-100 text-green-700',
};
const PERIOD_LABELS: Record<string, string> = {
    weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', custom: 'Custom',
};
const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

interface Props {
    reports: { data: any[]; current_page: number; last_page: number; total: number };
    clients:  { id: number; name: string }[];
    projects: { id: number; name: string }[];
}

export default function ClientReports({ reports, clients, projects }: Props) {
    // FIX: was confirm() — use project-standard ConfirmDialog
    const { confirmDelete, ConfirmDialog }  = useDeleteConfirmation();
    const { confirm } = useConfirmDialog();

    const handleSend = async (reportId: number) => {
        await confirm({
            title: 'Mark as Sent',
            description: 'This will mark the report as sent to the client.',
            confirmLabel: 'Mark Sent',
            onConfirm: async () => {
                router.post(`/client-reports/${reportId}/send`, {}, { preserveScroll: true });
            }
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

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Client Reports" />
            <div className="p-6 space-y-6 max-w-5xl mx-auto">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Client Reports</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Weekly, monthly &amp; quarterly reports sent to clients
                        </p>
                    </div>
                    <Button asChild>
                        <Link href="/client-reports/create">
                            <Plus className="h-4 w-4 mr-1.5" />New Report
                        </Link>
                    </Button>
                </div>

                {reports.data.length === 0 ? (
                    <Card className="p-12 text-center">
                        <BarChart3 className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
                        <p className="text-muted-foreground mb-4">
                            No client reports yet. Create your first report to keep clients informed.
                        </p>
                        <Button asChild>
                            <Link href="/client-reports/create">Create Report</Link>
                        </Button>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {reports.data.map((r: any) => (
                            <Card key={r.id} className="p-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <Link
                                                href={`/client-reports/${r.id}`}
                                                className="font-medium text-sm hover:text-primary hover:underline"
                                            >
                                                {r.title}
                                            </Link>
                                            <Badge className={`text-xs capitalize ${STATUS_COLORS[r.status] ?? ''}`}>
                                                {r.status}
                                            </Badge>
                                            <Badge variant="outline" className="text-xs">
                                                {PERIOD_LABELS[r.period_type] ?? r.period_type}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                                            <span className="font-medium">{r.client?.name}</span>
                                            {r.project && <span>· {r.project.name}</span>}
                                            <span>· {fmtDate(r.period_start)} – {fmtDate(r.period_end)}</span>
                                            {r.sent_at   && <span className="text-blue-600">· Sent {fmtDate(r.sent_at)}</span>}
                                            {r.viewed_at && <span className="text-green-600">· Viewed {fmtDate(r.viewed_at)}</span>}
                                        </div>
                                        {r.metrics && (
                                            <div className="flex items-center gap-4 mt-2 text-xs">
                                                {r.metrics.invoices_total > 0 && (
                                                    <span className="text-muted-foreground">
                                                        {r.metrics.invoices_paid}/{r.metrics.invoices_total} invoices paid
                                                    </span>
                                                )}
                                                {r.metrics.billed > 0 && (
                                                    <span className="text-muted-foreground">
                                                        Billed: ${Number(r.metrics.billed).toLocaleString()}
                                                    </span>
                                                )}
                                                {r.metrics.outstanding > 0 && (
                                                    <span className="text-red-600">
                                                        Outstanding: ${Number(r.metrics.outstanding).toLocaleString()}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex gap-1 shrink-0">
                                        <Button variant="ghost" size="sm" asChild className="h-8 px-2">
                                            <Link href={`/client-reports/${r.id}`}>
                                                <Eye className="h-3.5 w-3.5" />
                                            </Link>
                                        </Button>
                                        {r.status === 'draft' && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 px-2 text-blue-600 hover:text-blue-700"
                                                // FIX: was confirm() inline
                                                onClick={() => handleSend(r.id)}
                                            >
                                                <Send className="h-3.5 w-3.5" />
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 px-2 text-muted-foreground hover:text-red-500"
                                            // FIX: was confirm() inline
                                            onClick={() => handleDelete(r.id, r.title)}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* FIX: render dialog portals */}
            <ConfirmDialog />
        </AppLayout>
    );
}
/**
 * rfps/index.tsx — RFP & RFQ management list
 */
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { type BreadcrumbItem } from '@/types';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Plus, Search, FileText, Clock, CheckCircle2, XCircle, AlertCircle, Filter } from 'lucide-react';
import { format } from 'date-fns';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Procurement', href: '#' },
    { title: 'RFPs & RFQs', href: '/rfps' },
];

interface Rfp {
    id: number; type: 'rfp' | 'rfq'; title: string; reference_number: string | null;
    status: string; approval_status: string; submission_deadline: string | null;
    budget: string | null; currency: string; created_at: string;
}

interface Props {
    rfps: { data: Rfp[]; current_page: number; last_page: number; total: number };
    counts: Record<string, number>;
}

const STATUS_CONFIG: Record<string, { label: string; pill: string; icon: React.ElementType }> = {
    draft:      { label: 'Draft',      pill: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800',        icon: FileText      },
    review:     { label: 'In Review',  pill: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30',      icon: Clock         },
    published:  { label: 'Published',  pill: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30', icon: CheckCircle2 },
    closed:     { label: 'Closed',     pill: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30',   icon: XCircle       },
    awarded:    { label: 'Awarded',    pill: 'bg-violet-50 text-violet-700 dark:bg-violet-950/30', icon: CheckCircle2 },
    cancelled:  { label: 'Cancelled',  pill: 'bg-red-50 text-red-600 dark:bg-red-950/30',         icon: XCircle       },
};

const APPROVAL_CONFIG: Record<string, { label: string; color: string }> = {
    not_required: { label: '',          color: '' },
    pending:      { label: '⏳ Pending', color: 'text-amber-600' },
    approved:     { label: '✓ Approved', color: 'text-emerald-600' },
    rejected:     { label: '✗ Rejected', color: 'text-red-600' },
};

export default function RfpIndex({ rfps, counts }: Props) {
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    function applyFilters() {
        router.get('/rfps', { search, type: typeFilter, status: statusFilter }, { preserveState: true });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="RFPs & RFQs" />
            <div className="space-y-5 p-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-lg font-bold">RFPs & RFQs</h1>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Manage your Requests for Proposals and Quotations
                        </p>
                    </div>
                    <Link href="/rfps/create">
                        <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white gap-1.5">
                            <Plus className="h-3.5 w-3.5" /> New RFP/RFQ
                        </Button>
                    </Link>
                </div>

                {/* Status tabs */}
                <div className="flex gap-2 overflow-x-auto pb-1">
                    {[
                        { value: '', label: 'All', count: rfps.total },
                        ...Object.entries(counts).map(([k, v]) => ({
                            value: k,
                            label: STATUS_CONFIG[k]?.label ?? k,
                            count: v,
                        })),
                    ].map(tab => (
                        <button key={tab.value} onClick={() => { setStatusFilter(tab.value); router.get('/rfps', { status: tab.value, search, type: typeFilter }, { preserveState: true }); }}
                            className={cn(
                                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-all',
                                statusFilter === tab.value
                                    ? 'bg-amber-500 border-amber-500 text-white'
                                    : 'bg-background border-border text-muted-foreground hover:border-amber-300'
                            )}>
                            {tab.label}
                            <span className={cn(
                                'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                                statusFilter === tab.value ? 'bg-white/25' : 'bg-muted'
                            )}>{tab.count}</span>
                        </button>
                    ))}
                </div>

                {/* Filters */}
                <div className="flex gap-2">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input placeholder="Search by title or reference…" className="pl-9 h-8 text-sm"
                            value={search} onChange={e => setSearch(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && applyFilters()} />
                    </div>
                    <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); router.get('/rfps', { type: e.target.value, search, status: statusFilter }, { preserveState: true }); }}
                        className="h-8 text-sm rounded-md border border-input bg-background px-2">
                        <option value="">All Types</option>
                        <option value="rfp">RFP</option>
                        <option value="rfq">RFQ</option>
                    </select>
                </div>

                {/* Table */}
                <div className="bg-card border border-border rounded-lg overflow-hidden">
                    {rfps.data.length === 0 ? (
                        <div className="p-12 text-center">
                            <FileText className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
                            <p className="text-sm font-medium text-muted-foreground">No RFPs or RFQs yet</p>
                            <p className="text-xs text-muted-foreground mt-1">Create your first request to get started</p>
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border bg-muted/30">
                                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Title</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Approval</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Deadline</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Budget</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {rfps.data.map(rfp => {
                                    const sc = STATUS_CONFIG[rfp.status] ?? STATUS_CONFIG.draft;
                                    const ac = APPROVAL_CONFIG[rfp.approval_status] ?? APPROVAL_CONFIG.not_required;
                                    const StatusIcon = sc.icon;
                                    return (
                                        <tr key={rfp.id} className="hover:bg-muted/20 transition-colors">
                                            <td className="px-4 py-3">
                                                <Link href={`/rfps/${rfp.id}`} className="font-medium hover:text-amber-600 transition-colors">
                                                    {rfp.title}
                                                </Link>
                                                {rfp.reference_number && (
                                                    <p className="text-xs text-muted-foreground font-mono mt-0.5">{rfp.reference_number}</p>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-xs font-mono font-semibold uppercase bg-muted px-2 py-0.5 rounded">
                                                    {rfp.type}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={cn('inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full', sc.pill)}>
                                                    <StatusIcon className="h-3 w-3" />
                                                    {sc.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                {ac.label && <span className={cn('text-xs font-medium', ac.color)}>{ac.label}</span>}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-muted-foreground">
                                                {rfp.submission_deadline
                                                    ? format(new Date(rfp.submission_deadline), 'd MMM yyyy')
                                                    : '—'
                                                }
                                            </td>
                                            <td className="px-4 py-3 text-xs text-muted-foreground">
                                                {rfp.budget
                                                    ? `${rfp.currency} ${parseFloat(rfp.budget).toLocaleString()}`
                                                    : '—'
                                                }
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}

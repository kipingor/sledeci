/**
 * trade-documents/index.tsx — list of cross-border trade documents
 */
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { type BreadcrumbItem } from '@/types';
import { FileText, Plus, Globe, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Trade Documents', href: '/trade-documents' }];

interface TradeDoc {
    id: number; document_number: string; type: string; trade_direction: string;
    origin_country: string; destination_country: string; status: string;
    total_value: number; currency: string; created_at: string;
    invoice: { id: number; number: string } | null;
}

interface Props {
    documents: { data: TradeDoc[]; links: any[]; current_page: number; last_page: number; total: number };
    filters: { type?: string; status?: string };
}

const TYPE_LABELS: Record<string, string> = {
    certificate_of_origin: 'Certificate of Origin',
    customs_declaration:   'Customs Declaration',
    proforma_invoice:      'Pro-forma Invoice',
    packing_list:          'Packing List',
};

const STATUS_CONFIG: Record<string, { label: string; pill: string; icon: React.ElementType }> = {
    draft:                  { label: 'Draft',       pill: 'bg-zinc-50 text-zinc-600 ring-zinc-200',     icon: FileText },
    pending_certification:  { label: 'Pending Cert', pill: 'bg-amber-50 text-amber-700 ring-amber-200', icon: Clock },
    certified:              { label: 'Certified',   pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200', icon: CheckCircle2 },
    rejected:               { label: 'Rejected',    pill: 'bg-red-50 text-red-700 ring-red-200',        icon: XCircle },
};

export default function TradeDocumentsIndex({ documents, filters }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Trade Documents" />
            <div className="space-y-5 p-6">

                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-lg font-bold flex items-center gap-2">
                            <Globe className="h-5 w-5 text-amber-500" /> Trade Documents
                        </h1>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Certificates of Origin, customs declarations, and export documentation
                        </p>
                    </div>
                    <Link href="/trade-documents/create">
                        <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white gap-1.5">
                            <Plus className="h-3.5 w-3.5" /> New Document
                        </Button>
                    </Link>
                </div>

                <div className="bg-card border border-border rounded-xl overflow-hidden">
                    {documents.data.length === 0 ? (
                        <div className="p-12 text-center">
                            <Globe className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
                            <p className="text-sm font-medium text-muted-foreground">No trade documents yet</p>
                            <p className="text-xs text-muted-foreground mt-1">Create your first export document to get started</p>
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border bg-muted/30">
                                    {['Document #', 'Type', 'Route', 'Value', 'Status', 'Date'].map(h => (
                                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {documents.data.map(doc => {
                                    const sc = STATUS_CONFIG[doc.status] ?? STATUS_CONFIG.draft;
                                    const Icon = sc.icon;
                                    return (
                                        <tr key={doc.id} className="hover:bg-muted/20">
                                            <td className="px-4 py-3">
                                                <Link href={`/trade-documents/${doc.id}`} className="font-mono font-semibold text-primary hover:underline">
                                                    {doc.document_number}
                                                </Link>
                                            </td>
                                            <td className="px-4 py-3 text-xs">{TYPE_LABELS[doc.type]}</td>
                                            <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                                                {doc.origin_country} → {doc.destination_country}
                                            </td>
                                            <td className="px-4 py-3 text-sm font-semibold">
                                                {doc.currency} {doc.total_value.toLocaleString()}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={cn('inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ring-1', sc.pill)}>
                                                    <Icon className="h-3 w-3" /> {sc.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-muted-foreground">
                                                {format(new Date(doc.created_at), 'd MMM yyyy')}
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

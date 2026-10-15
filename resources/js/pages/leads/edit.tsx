import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import { LeadForm } from '@/components/forms/lead-form';
import { useState } from 'react';
import { toast } from 'sonner';
import { FileText, ArrowLeft, ChevronRight } from 'lucide-react';
import { type BreadcrumbItem } from '@/types';

interface Lead {
    id: number;
    title: string;
    type: 'document' | 'conversation';
    description?: string;
    owner_id?: number;
    pipeline_stage_id: number;
    status?: 'new' | 'contacted' | 'qualified' | 'proposal_sent' | 'negotiation' | 'won' | 'lost' | 'archived';
    estimated_value?: number | null;
    metadata?: { source?: string; tags?: string };
}

interface Props {
    lead: Lead;
    users: Array<{ id: number; name: string }>;
    pipelineStages: Array<{ id: number; name: string }>;
}

export default function EditLead({ lead, users, pipelineStages }: Props) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Leads', href: '/leads' },
        { title: lead?.title ?? 'Lead', href: `/leads/${lead?.id}` },
        { title: 'Edit', href: `/leads/${lead?.id}/edit` },
    ];

    const handleSubmit = (data: any) => {
        setIsSubmitting(true);
        router.put(`/leads/${lead.id}`, data, {
            onSuccess: () => {
                toast.success('Lead updated successfully!');
                router.visit(`/leads/${lead.id}`);
            },
            onError: () => {
                toast.error('Failed to update lead', { description: 'Please check the form for errors' });
            },
            onFinish: () => setIsSubmitting(false),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Edit: ${lead?.title ?? 'Lead'}`} />

            {/* ── SF record edit header ── */}
            <div className="bg-card border-b border-border px-6 py-4 shrink-0">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => router.visit(`/leads/${lead?.id}`)}
                        className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </button>
                    <nav className="flex items-center gap-1.5 text-sm">
                        <a href="/leads" className="text-muted-foreground hover:text-foreground transition-colors">Leads</a>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                        <a href={`/leads/${lead?.id}`} className="text-muted-foreground hover:text-foreground transition-colors truncate max-w-[160px]">
                            {lead?.title ?? 'Lead'}
                        </a>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                        <span className="font-semibold">Edit</span>
                    </nav>
                </div>
                <div className="flex items-center gap-3 mt-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">{lead?.title ?? 'Edit Lead'}</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">Edit lead details below</p>
                    </div>
                </div>
            </div>

            {/* ── Form body ── */}
            <div className="p-6 overflow-auto max-w-3xl">
                <LeadForm
                    initialData={lead}
                    users={users}
                    pipelineStages={pipelineStages}
                    onSubmit={handleSubmit}
                    isSubmitting={isSubmitting}
                    submitLabel="Save Changes"
                    showStatus={true}
                />
            </div>
        </AppLayout>
    );
}
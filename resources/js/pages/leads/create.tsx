import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import { LeadForm } from '@/components/forms/lead-form';
import { useState } from 'react';
import { toast } from 'sonner';
import { useFormAutosave } from '@/hooks/use-form-autosave';
import { FileText, ArrowLeft, ChevronRight } from 'lucide-react';
import { type BreadcrumbItem } from '@/types';

interface CreateLeadProps {
    users: Array<{ id: number; name: string }>;
    pipelineStages: Array<{ id: number; name: string }>;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Leads', href: '/leads' },
    { title: 'New Lead', href: '/leads/create' },
];

export default function CreateLead({ users, pipelineStages }: CreateLeadProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { clearDraft } = useFormAutosave('lead_create');

    const handleSubmit = (data: any) => {
        setIsSubmitting(true);
        router.post('/leads', data, {
            onSuccess: (page) => {
                clearDraft();
                toast.success('Lead created successfully!');
                const lead = (page.props as any).lead;
                if (lead?.id) {
                    router.visit(`/leads/${lead.id}`);
                } else {
                    router.visit('/leads');
                }
            },
            onError: () => {
                toast.error('Failed to create lead', { description: 'Please check the form for errors' });
            },
            onFinish: () => setIsSubmitting(false),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="New Lead" />

            {/* ── SF record creation header ── */}
            <div className="bg-card border-b border-border px-6 py-4 shrink-0">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => router.visit('/leads')}
                        className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </button>
                    <nav className="flex items-center gap-1.5 text-sm">
                        <a href="/leads" className="text-muted-foreground hover:text-foreground transition-colors">Leads</a>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                        <span className="font-semibold">New Lead</span>
                    </nav>
                </div>
                <div className="flex items-center gap-3 mt-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">New Lead</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">Fill in the details below to create a lead</p>
                    </div>
                </div>
            </div>

            {/* ── Form body ── */}
            <div className="p-6 overflow-auto max-w-3xl">
                <LeadForm
                    users={users}
                    pipelineStages={pipelineStages}
                    onSubmit={handleSubmit}
                    isSubmitting={isSubmitting}
                    submitLabel="Create Lead"
                    showStatus={false}
                />
            </div>
        </AppLayout>
    );
}
import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import { useForm } from 'react-hook-form';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { type BreadcrumbItem } from '@/types';
import { FileText, ChevronRight, Save } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Proposals', href: '/proposals' },
    { title: 'Create', href: '/proposals/create' },
];

export default function ProposalCreate() {
    const { register, handleSubmit } = useForm({ defaultValues: { title: '', content: '', opportunity_id: '' } });
    const onSubmit = (values: any) => router.post('/proposals', values);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Create Proposal" />
            <div className="bg-card border-b border-border px-6 py-4">
                <nav className="flex items-center gap-1.5 text-sm mb-3">
                    <a href="/proposals" className="text-muted-foreground hover:text-foreground">Proposals</a>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                    <span className="font-semibold">Create</span>
                </nav>
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center"><FileText className="h-5 w-5 text-primary" /></div>
                    <h1 className="text-xl font-bold tracking-tight">New Proposal</h1>
                </div>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 max-w-2xl space-y-5">
                <div className="bg-card border border-border rounded-lg p-5 space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">Title *</label>
                        <Input {...register('title', { required: true })} placeholder="Proposal title…" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">Content *</label>
                        <Textarea {...register('content', { required: true })} rows={12} className="resize-y font-mono text-sm" placeholder="Proposal content (Markdown or plain text)…" />
                    </div>
                </div>
                <div className="flex gap-3">
                    <Button type="submit" className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                        <Save className="h-4 w-4" /> Create Proposal
                    </Button>
                    <Button type="button" variant="outline" onClick={() => history.back()}>Cancel</Button>
                </div>
            </form>
        </AppLayout>
    );
}
import AppLayout from '@/layouts/app-layout';
import { Head, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { type BreadcrumbItem } from '@/types';
import { Columns, ChevronRight, Save } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Pipeline Stages', href: '/pipeline-stages' },
    { title: 'Create', href: '/pipeline-stages/create' },
];

export default function PipelineStageCreate() {
    const form = useForm({ name: '', description: '' });
    const onSubmit = (e: React.FormEvent) => { e.preventDefault(); form.post('/pipeline-stages'); };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Create Pipeline Stage" />
            <div className="bg-card border-b border-border px-6 py-4">
                <nav className="flex items-center gap-1.5 text-sm mb-3">
                    <a href="/pipeline-stages" className="text-muted-foreground hover:text-foreground">Pipeline Stages</a>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                    <span className="font-semibold">Create</span>
                </nav>
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center"><Columns className="h-5 w-5 text-primary" /></div>
                    <h1 className="text-xl font-bold tracking-tight">New Pipeline Stage</h1>
                </div>
            </div>
            <form onSubmit={onSubmit} className="p-6 max-w-lg space-y-5">
                <div className="bg-card border border-border rounded-lg p-5 space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">Name *</label>
                        <Input value={form.data.name as string} onChange={e => form.setData('name', e.target.value)} placeholder="e.g. Qualified" autoFocus />
                        {form.errors.name && <p className="text-xs text-destructive">{form.errors.name}</p>}
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">Description</label>
                        <Textarea value={form.data.description as string} onChange={e => form.setData('description', e.target.value)} rows={3} className="resize-none" placeholder="Describe when a lead enters this stage…" />
                    </div>
                </div>
                <div className="flex gap-3">
                    <Button type="submit" disabled={form.processing} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                        <Save className="h-4 w-4" /> Create Stage
                    </Button>
                    <Button type="button" variant="outline" onClick={() => history.back()}>Cancel</Button>
                </div>
            </form>
        </AppLayout>
    );
}
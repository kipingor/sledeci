import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import { useForm } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Clock, ChevronRight, Save } from 'lucide-react';

export default function TimeLogCreate() {
    const { register, handleSubmit } = useForm({ defaultValues: { task_id: '', hours: '', notes: '' } });
    const onSubmit = (values: any) => router.post('/time-logs', values);

    return (
        <AppLayout breadcrumbs={[{ title: 'Time Logs', href: '/time-logs' }, { title: 'Log Time', href: '/time-logs/create' }]}>
            <Head title="Log Time" />
            <div className="bg-card border-b border-border px-6 py-4">
                <nav className="flex items-center gap-1.5 text-sm mb-3">
                    <a href="/time-logs" className="text-muted-foreground hover:text-foreground">Time Logs</a>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                    <span className="font-semibold">Log Time</span>
                </nav>
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center"><Clock className="h-5 w-5 text-primary" /></div>
                    <h1 className="text-xl font-bold tracking-tight">Log Time</h1>
                </div>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 max-w-lg space-y-5">
                <div className="bg-card border border-border rounded-lg p-5 space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">Task ID</label>
                        <Input {...register('task_id')} placeholder="Task identifier…" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">Hours *</label>
                        <Input type="number" step="0.25" min="0.25" {...register('hours', { required: true })} placeholder="e.g. 2.5" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">Notes</label>
                        <Input {...register('notes')} placeholder="What did you work on?" />
                    </div>
                </div>
                <div className="flex gap-3">
                    <Button type="submit" className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                        <Save className="h-4 w-4" /> Save
                    </Button>
                    <Button type="button" variant="outline" onClick={() => history.back()}>Cancel</Button>
                </div>
            </form>
        </AppLayout>
    );
}
import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { type BreadcrumbItem } from '@/types';
import { Flag, ChevronRight, Save } from 'lucide-react';
import { useState } from 'react';

interface Milestone {
    id: number;
    title: string;
    description: string | null;
    scheduled_date: string | null;
    status: string;
    project: { id: number; name: string };
}

interface Props { milestone: Milestone }

function Field({ label, required, error, children }: any) {
    return (
        <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                {label}{required && <span className="text-destructive ml-0.5">*</span>}
            </label>
            {children}
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    );
}

export default function MilestoneEdit({ milestone }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Milestones', href: '/milestones' },
        { title: 'Edit', href: `/milestones/${milestone.id}/edit` },
    ];

    const [form, setForm] = useState({
        title:          milestone.title,
        description:    milestone.description ?? '',
        scheduled_date: milestone.scheduled_date?.slice(0, 10) ?? '',
        status:         milestone.status,
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const s = (f: any) => setForm(prev => ({ ...prev, ...f }));

    function submit() {
        setSaving(true);
        router.put(`/milestones/${milestone.id}`, form, {
            onError: e => { setErrors(e); setSaving(false); },
            onSuccess: () => setSaving(false),
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Edit: ${milestone.title}`} />
            <div className="bg-card border-b border-border px-6 py-4">
                <nav className="flex items-center gap-1.5 text-sm mb-3">
                    <a href="/milestones" className="text-muted-foreground hover:text-foreground">Milestones</a>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                    <span className="font-semibold">Edit</span>
                </nav>
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <Flag className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">{milestone.title}</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Project: <a href={`/projects/${milestone.project.id}`} className="text-primary hover:underline">{milestone.project.name}</a>
                        </p>
                    </div>
                </div>
            </div>

            <div className="p-6 max-w-lg space-y-5">
                <div className="bg-card border border-border rounded-lg overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-border bg-muted/30">
                        <p className="text-sm font-semibold">Milestone Details</p>
                    </div>
                    <div className="p-5 space-y-4">
                        <Field label="Title" required error={errors.title}>
                            <Input value={form.title} onChange={e => s({ title: e.target.value })} autoFocus />
                        </Field>

                        <Field label="Description" error={errors.description}>
                            <textarea
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] resize-none"
                                value={form.description}
                                onChange={e => s({ description: e.target.value })}
                                placeholder="What needs to be achieved by this milestone?"
                            />
                        </Field>

                        <Field label="Scheduled Date" error={errors.scheduled_date}>
                            <Input
                                type="date"
                                value={form.scheduled_date}
                                onChange={e => s({ scheduled_date: e.target.value })}
                            />
                        </Field>

                        <Field label="Status" error={errors.status}>
                            <select
                                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                                value={form.status}
                                onChange={e => s({ status: e.target.value })}
                            >
                                <option value="pending">Pending</option>
                                <option value="in_progress">In Progress</option>
                                <option value="completed">Completed</option>
                                <option value="missed">Missed</option>
                            </select>
                        </Field>
                    </div>
                </div>

                <div className="flex gap-3">
                    <Button
                        onClick={submit}
                        disabled={saving || !form.title}
                        className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                        <Save className="h-4 w-4" />
                        {saving ? 'Saving…' : 'Save Changes'}
                    </Button>
                    <Button variant="outline" onClick={() => history.back()}>Cancel</Button>
                </div>
            </div>
        </AppLayout>
    );
}
import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { type BreadcrumbItem } from '@/types';
import { MessageSquare, ArrowLeft, ChevronRight, Save } from 'lucide-react';
import { useState } from 'react';

interface LeadOption {
    id: number | string;
    title: string;
}

interface Props {
    leads?: LeadOption[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Conversations', href: '/conversations' },
    { title: 'New Conversation', href: '/conversations/create' },
];

function Field({ label, required, error, children }: {
    label: string; required?: boolean; error?: string; children: React.ReactNode;
}) {
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

function Section({ icon: Icon, title, description, children }: {
    icon: React.ComponentType<{ className?: string }>;
    title: string; description?: string; children: React.ReactNode;
}) {
    return (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border bg-muted/30">
                <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="h-3.5 w-3.5 text-primary" />
                </div>
                <div>
                    <p className="text-sm font-semibold">{title}</p>
                    {description && <p className="text-xs text-muted-foreground">{description}</p>}
                </div>
            </div>
            <div className="p-5">{children}</div>
        </div>
    );
}

export default function ConversationCreate({ leads = [] }: Props) {
    const [form, setForm] = useState({
        lead_id: String(leads[0]?.id ?? ''),
        message: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const isEmptyLeadList = leads.length === 0;

    function submit() {
        setSaving(true);
        router.post('/conversations', form, {
            onError: (e) => { setErrors(e as any); setSaving(false); },
            onSuccess: () => setSaving(false),
        });
    }

    const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        setForm(f => ({ ...f, [k]: e.target.value }));

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="New Conversation" />

            <div className="bg-card border-b border-border px-6 py-4">
                <div className="flex items-center gap-3">
                    <button type="button" onClick={() => history.back()}
                        className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground">
                        <ArrowLeft className="h-4 w-4" />
                    </button>
                    <nav className="flex items-center gap-1.5 text-sm">
                        <a href="/conversations" className="text-muted-foreground hover:text-foreground transition-colors">Conversations</a>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                        <span className="font-semibold">New Conversation</span>
                    </nav>
                </div>
                <div className="flex items-center gap-3 mt-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <MessageSquare className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">New Conversation</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">Create a conversation record linked to a lead.</p>
                    </div>
                </div>
            </div>

            <div className="p-6 max-w-2xl space-y-5">
                <Section icon={MessageSquare} title="Conversation Details" description="Choose a lead and write your message">
                    <div className="space-y-4">
                        <Field label="Lead" required error={errors.lead_id}>
                            {isEmptyLeadList ? (
                                <div className="rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground">No leads available.</div>
                            ) : (
                                <select
                                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                                    value={form.lead_id}
                                    onChange={set('lead_id')}
                                >
                                    <option value="">Select lead to tag</option>
                                    {leads.map(lead => (
                                        <option key={lead.id} value={String(lead.id)}>{lead.title}</option>
                                    ))}
                                </select>
                            )}
                        </Field>

                        <Field label="Message" required error={errors.message}>
                            <textarea
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[120px] resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                                value={form.message}
                                onChange={set('message')}
                                placeholder="Enter conversation text or notes…"
                                rows={5}
                            />
                        </Field>
                    </div>
                </Section>
            </div>

            <div className="sticky bottom-0 bg-card border-t border-border px-6 py-3 flex items-center justify-between">
                <Button type="button" variant="ghost" onClick={() => history.back()}>Cancel</Button>
                <Button
                    type="button"
                    onClick={submit}
                    disabled={saving || !form.lead_id || !form.message || isEmptyLeadList}
                    className="gap-2"
                >
                    <Save className="h-4 w-4" />
                    {saving ? 'Saving…' : 'Create Conversation'}
                </Button>
            </div>
        </AppLayout>
    );
}

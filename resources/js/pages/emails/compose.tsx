import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import { useForm } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { type BreadcrumbItem } from '@/types';
import { Mail, ChevronRight, Send } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Emails', href: '/emails' },
    { title: 'Compose', href: '/emails/compose' },
];

export default function EmailCompose() {
    const { register, handleSubmit } = useForm({ defaultValues: { recipient: '', subject: '', body: '' } });
    const onSubmit = (values: any) => router.post('/emails', values);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Compose Email" />
            <div className="bg-card border-b border-border px-6 py-4">
                <nav className="flex items-center gap-1.5 text-sm mb-3">
                    <a href="/emails" className="text-muted-foreground hover:text-foreground">Emails</a>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                    <span className="font-semibold">Compose</span>
                </nav>
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center"><Mail className="h-5 w-5 text-primary" /></div>
                    <h1 className="text-xl font-bold tracking-tight">Compose Email</h1>
                </div>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 max-w-2xl space-y-4">
                <div className="bg-card border border-border rounded-lg p-5 space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">To *</label>
                        <Input {...register('recipient', { required: true })} placeholder="recipient@example.com" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">Subject</label>
                        <Input {...register('subject')} placeholder="Email subject…" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">Body *</label>
                        <Textarea {...register('body', { required: true })} rows={10} className="resize-none font-mono text-sm" placeholder="Compose your message…" />
                    </div>
                </div>
                <div className="flex gap-3">
                    <Button type="submit" className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                        <Send className="h-4 w-4" /> Send
                    </Button>
                    <Button type="button" variant="outline" onClick={() => history.back()}>Discard</Button>
                </div>
            </form>
        </AppLayout>
    );
}
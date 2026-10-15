import AppLayout from '@/layouts/app-layout';
import { Head, Link, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import EmailCard from '@/pages/emails/email-card';
import { type BreadcrumbItem } from '@/types';
import { Mail, Plus } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Emails', href: '/emails' }];

export default function EmailsIndex() {
    const { props } = usePage<any>();
    const emails = props.emails?.data ?? [];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Emails" />
            <div className="flex flex-col h-full">
                <div className="bg-card border-b border-border">
                    <div className="flex items-center justify-between px-6 py-3.5">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center"><Mail className="h-4 w-4 text-primary" /></div>
                            <h1 className="text-base font-bold tracking-tight">Emails</h1>
                        </div>
                        <Button size="sm" className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90" asChild>
                            <Link href="/emails/compose"><Plus className="h-3.5 w-3.5" /> Compose</Link>
                        </Button>
                    </div>
                </div>
                <div className="flex-1 overflow-auto bg-background p-5 space-y-2">
                    {emails.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                            <Mail className="h-10 w-10 mb-3 opacity-20" />
                            <p>No emails yet.</p>
                        </div>
                    )}
                    {emails.map((e: any) => <EmailCard key={e.id} email={e} />)}
                </div>
            </div>
        </AppLayout>
    );
}
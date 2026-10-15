import AppLayout from '@/layouts/app-layout';
import { Head, usePage } from '@inertiajs/react';
import { Mail } from 'lucide-react';

export default function EmailShow() {
    const { props } = usePage<any>();
    const email = props.email;

    return (
        <AppLayout breadcrumbs={[{ title: 'Emails', href: '/emails' }, { title: email?.subject ?? 'Email', href: '#' }]}>
            <Head title={email?.subject ?? 'Email'} />
            <div className="flex flex-col h-full">
                <div className="bg-card border-b border-border px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                            <Mail className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight">{email?.subject ?? '(No subject)'}</h1>
                            <p className="text-sm text-muted-foreground mt-0.5">To: {email?.recipient}</p>
                        </div>
                    </div>
                </div>
                <div className="flex-1 overflow-auto bg-background p-6 max-w-3xl">
                    <div className="bg-card border border-border rounded-lg p-8">
                        <div className="prose prose-sm max-w-none text-foreground"
                            dangerouslySetInnerHTML={{ __html: email?.body ?? '' }} />
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
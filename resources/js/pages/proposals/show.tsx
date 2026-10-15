import AppLayout from '@/layouts/app-layout';
import { Head, usePage, Link } from '@inertiajs/react';
import { type BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import { FileText, Edit } from 'lucide-react';

export default function ProposalShow() {
    const { props } = usePage<any>();
    const proposal = props.proposal;
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Proposals', href: '/proposals' },
        { title: proposal?.title ?? 'Proposal', href: `/proposals/${proposal?.id}` },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={proposal?.title ?? 'Proposal'} />
            <div className="flex flex-col h-full">
                <div className="bg-card border-b border-border px-6 py-4">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                                <FileText className="h-5 w-5 text-primary" />
                            </div>
                            <h1 className="text-xl font-bold tracking-tight truncate">{proposal?.title ?? 'Proposal'}</h1>
                        </div>
                        <Button size="sm" variant="outline" asChild>
                            <Link href={`/proposals/${proposal?.id}/edit`}><Edit className="h-3.5 w-3.5 mr-1.5" /> Edit</Link>
                        </Button>
                    </div>
                </div>
                <div className="flex-1 overflow-auto bg-background p-6 max-w-3xl">
                    <div className="bg-card border border-border rounded-lg p-8">
                        <div className="prose prose-sm max-w-none text-foreground"
                            dangerouslySetInnerHTML={{ __html: proposal?.content ?? '' }} />
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
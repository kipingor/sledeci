import AppLayout from '@/layouts/app-layout';
import { Head, Link, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import ProposalCard from '@/pages/proposals/proposal-card';
import { type BreadcrumbItem } from '@/types';
import { FileText, Plus } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Proposals', href: '/proposals' }];

export default function ProposalsIndex() {
    const { props } = usePage<any>();
    const proposals = props.proposals?.data ?? [];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Proposals" />
            <div className="flex flex-col h-full">
                <div className="bg-card border-b border-border">
                    <div className="flex items-center justify-between px-6 py-3.5">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                                <FileText className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-base font-bold tracking-tight">Proposals</h1>
                                <p className="text-xs text-muted-foreground">{proposals.length} proposals</p>
                            </div>
                        </div>
                        <Button size="sm" className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90" asChild>
                            <Link href="/proposals/create"><Plus className="h-3.5 w-3.5" /> New Proposal</Link>
                        </Button>
                    </div>
                </div>
                <div className="flex-1 overflow-auto p-6 bg-background">
                    <div className="grid gap-4 sm:grid-cols-2 max-w-4xl">
                        {proposals.map((p: any) => <ProposalCard key={p.id} proposal={p} />)}
                        {proposals.length === 0 && (
                            <div className="col-span-2 text-center py-16 text-muted-foreground">
                                <FileText className="h-10 w-10 mx-auto mb-3 opacity-20" />
                                <p className="font-medium">No proposals yet</p>
                                <Button size="sm" className="mt-4" asChild><Link href="/proposals/create">Create Proposal</Link></Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
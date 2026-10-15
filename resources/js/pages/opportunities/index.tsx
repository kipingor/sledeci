import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import { OpportunityKanban } from '@/components/opportunities';
import { Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { type BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Opportunities', href: '/opportunities' }];

export default function OpportunitiesPage() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Opportunities" />
            <div className="flex flex-col h-full">

                {/* ── Record header — matches the pattern from leads/projects ── */}
                <div className="bg-card border-b border-border">
                    <div className="flex items-center justify-between px-6 py-3.5">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                                <Briefcase className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-base font-bold tracking-tight">Opportunities</h1>
                                <p className="text-xs text-muted-foreground">Kanban pipeline view</p>
                            </div>
                        </div>
                        <Button
                            size="sm"
                            className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                            asChild
                        >
                            <Link href="/opportunities/create">
                                <Plus className="h-3.5 w-3.5" /> New Opportunity
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* ── Kanban board — fills remaining height ── */}
                <div className="flex-1 overflow-hidden">
                    <OpportunityKanban />
                </div>
            </div>
        </AppLayout>
    );
}
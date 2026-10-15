import AppLayout from '@/layouts/app-layout';
import { Head, Link, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { type BreadcrumbItem } from '@/types';
import { Columns, Plus, ChevronRight, Edit } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Pipeline Stages', href: '/pipeline-stages' }];

export default function PipelineStagesIndex() {
    const { props } = usePage<any>();
    const stages = props.stages ?? [];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Pipeline Stages" />
            <div className="flex flex-col h-full">
                <div className="bg-card border-b border-border">
                    <div className="flex items-center justify-between px-6 py-3.5">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center"><Columns className="h-4 w-4 text-primary" /></div>
                            <div>
                                <h1 className="text-base font-bold tracking-tight">Pipeline Stages</h1>
                                <p className="text-xs text-muted-foreground">{stages.length} stages configured</p>
                            </div>
                        </div>
                        <Button size="sm" className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90" asChild>
                            <Link href="/pipeline-stages/create"><Plus className="h-3.5 w-3.5" /> New Stage</Link>
                        </Button>
                    </div>
                </div>
                <div className="flex-1 overflow-auto bg-background p-5">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl">
                        {stages.map((s: any) => (
                            <div key={s.id} className="bg-card border border-border rounded-lg p-5 hover:border-primary/30 transition-colors">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <h3 className="font-semibold text-sm">{s.name}</h3>
                                    <Link href={`/pipeline-stages/${s.id}/edit`}
                                        className="text-muted-foreground hover:text-primary transition-colors flex-shrink-0">
                                        <Edit className="h-3.5 w-3.5" />
                                    </Link>
                                </div>
                                {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}
                            </div>
                        ))}
                        {stages.length === 0 && (
                            <div className="col-span-3 text-center py-12 text-muted-foreground">
                                <Columns className="h-10 w-10 mx-auto mb-3 opacity-20" />
                                <p>No pipeline stages yet. Create one to organise your leads.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
import AppLayout from '@/layouts/app-layout';
import { Head, Link, usePage } from '@inertiajs/react';
import { type BreadcrumbItem } from '@/types';
import { AlertTriangle, Folder, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Projects', href: '/projects' },
    { title: 'At Risk', href: '/projects/at-risk' },
];

const STATUS_PILL: Record<string, string> = {
    planning:  'bg-slate-50 text-slate-600 ring-slate-200',
    active:    'bg-emerald-50 text-emerald-700 ring-emerald-200',
    on_hold:   'bg-amber-50 text-amber-700 ring-amber-200',
    completed: 'bg-blue-50 text-blue-700 ring-blue-200',
    cancelled: 'bg-red-50 text-red-600 ring-red-200',
};

export default function ProjectsAtRisk() {
    const { props } = usePage<any>();
    const projects = props.projects ?? [];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Projects At Risk" />
            <div className="flex flex-col h-full">
                <div className="bg-card border-b border-border">
                    <div className="flex items-center gap-3 px-6 py-3.5">
                        <div className="h-8 w-8 rounded-md bg-red-100 flex items-center justify-center">
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                        </div>
                        <div>
                            <h1 className="text-base font-bold tracking-tight">Projects At Risk</h1>
                            <p className="text-xs text-muted-foreground">
                                {projects.length} project{projects.length !== 1 ? 's' : ''} flagged
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-auto bg-background p-5 space-y-3 max-w-3xl">
                    {projects.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                            <Folder className="h-10 w-10 mb-3 opacity-20" />
                            <p className="font-medium">No projects at risk</p>
                            <p className="text-sm mt-1">All projects are on track.</p>
                        </div>
                    )}

                    {projects.map((p: any) => (
                        <Link key={p.id} href={`/projects/${p.id}`}
                            className="block bg-card border border-red-200 rounded-lg p-4 hover:border-red-300 hover:shadow-sm transition-all">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-3 min-w-0">
                                    <div className="h-9 w-9 rounded-md bg-red-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <AlertTriangle className="h-4 w-4 text-red-500" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="font-semibold text-sm">{p.name}</p>
                                            <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full ring-1 capitalize',
                                                STATUS_PILL[p.status] ?? STATUS_PILL.active)}>
                                                {p.status?.replace('_', ' ')}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                                            {p.owner && <span>PM: {p.owner.name}</span>}
                                            {p.client && <span>· {p.client.name}</span>}
                                            {p.risk_reason && <span className="text-red-600 font-medium">· {p.risk_reason}</span>}
                                        </div>
                                    </div>
                                </div>
                                <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </AppLayout>
    );
}
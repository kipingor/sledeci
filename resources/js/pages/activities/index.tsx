import AppLayout from '@/layouts/app-layout';
import { Head, usePage } from '@inertiajs/react';
import { Activity, Phone, Mail, Calendar, CheckSquare, MessageSquare } from 'lucide-react';
import { type BreadcrumbItem } from '@/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Activities', href: '/activities' }];

const TYPE_ICON: Record<string, React.ComponentType<any>> = {
    call:    Phone,
    email:   Mail,
    meeting: Calendar,
    task:    CheckSquare,
    note:    MessageSquare,
};
const TYPE_PILL: Record<string, string> = {
    call:    'bg-sky-50 text-sky-700 ring-sky-200',
    email:   'bg-violet-50 text-violet-700 ring-violet-200',
    meeting: 'bg-amber-50 text-amber-700 ring-amber-200',
    task:    'bg-emerald-50 text-emerald-700 ring-emerald-200',
    note:    'bg-slate-50 text-slate-600 ring-slate-200',
};

export default function ActivityIndex() {
    const { activities } = usePage().props as any;
    const items = activities?.data ?? [];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Activities" />
            <div className="flex flex-col h-full">

                <div className="bg-card border-b border-border">
                    <div className="flex items-center gap-3 px-6 py-3.5">
                        <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                            <Activity className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-base font-bold tracking-tight">Activities</h1>
                            <p className="text-xs text-muted-foreground">{items.length} records</p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-auto bg-background">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-muted/40 border-b border-border sticky top-0">
                                {['#', 'Type', 'Description', 'Created'].map(h => (
                                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {items.length === 0 && (
                                <tr><td colSpan={4} className="py-20 text-center text-muted-foreground">
                                    <Activity className="h-10 w-10 mx-auto mb-3 opacity-20" />
                                    <p className="font-medium">No activities yet</p>
                                </td></tr>
                            )}
                            {items.map((a: any) => {
                                const Icon = TYPE_ICON[a.type] ?? Activity;
                                const pill = TYPE_PILL[a.type] ?? TYPE_PILL.note;
                                return (
                                    <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-2.5 text-xs font-mono text-muted-foreground">{a.id}</td>
                                        <td className="px-4 py-2.5">
                                            <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ring-1 capitalize', pill)}>
                                                <Icon className="h-3 w-3" />{a.type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5 max-w-xs">
                                            <p className="text-sm truncate">{a.description ?? '—'}</p>
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <span className="text-xs text-muted-foreground">
                                                {a.created_at ? format(new Date(a.created_at), 'MMM d, yyyy h:mm a') : '—'}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </AppLayout>
    );
}
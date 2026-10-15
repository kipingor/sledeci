import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import { Activity, Phone, Mail, Calendar, CheckSquare, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const TYPE_ICON: Record<string, React.ComponentType<any>> = {
    call: Phone, email: Mail, meeting: Calendar, task: CheckSquare, note: MessageSquare,
};
const TYPE_PILL: Record<string, string> = {
    call:    'bg-sky-50 text-sky-700 ring-sky-200',
    email:   'bg-violet-50 text-violet-700 ring-violet-200',
    meeting: 'bg-amber-50 text-amber-700 ring-amber-200',
    task:    'bg-emerald-50 text-emerald-700 ring-emerald-200',
    note:    'bg-slate-50 text-slate-600 ring-slate-200',
};

export default function ActivityShow({ activity }: any) {
    const Icon = TYPE_ICON[activity?.type] ?? Activity;
    const pill = TYPE_PILL[activity?.type] ?? TYPE_PILL.note;

    return (
        <AppLayout breadcrumbs={[{ title: 'Activities', href: '/activities' }, { title: `Activity #${activity?.id}`, href: '#' }]}>
            <Head title={`Activity #${activity?.id}`} />
            <div className="flex flex-col h-full">
                <div className="bg-card border-b border-border px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                            <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2.5">
                                <h1 className="text-xl font-bold tracking-tight">Activity #{activity?.id}</h1>
                                {activity?.type && (
                                    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ring-1 capitalize', pill)}>
                                        <Icon className="h-3 w-3" /> {activity.type}
                                    </span>
                                )}
                            </div>
                            {activity?.user?.name && (
                                <p className="text-sm text-muted-foreground mt-0.5">By {activity.user.name}</p>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex-1 overflow-auto bg-background p-6 max-w-xl">
                    <div className="bg-card border border-border rounded-lg p-5 space-y-3">
                        {activity?.description && (
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Description</p>
                                <p className="text-sm text-foreground leading-relaxed">{activity.description}</p>
                            </div>
                        )}
                        {activity?.created_at && (
                            <div className="pt-3 border-t border-border">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Created</p>
                                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                                    <Calendar className="h-3.5 w-3.5" />
                                    {format(new Date(activity.created_at), 'MMM d, yyyy h:mm a')}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
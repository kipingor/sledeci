import AppLayout from '@/layouts/app-layout';
import { Head, Link } from '@inertiajs/react';
import { type BreadcrumbItem } from '@/types';
import {
    Users, Calendar, Star, Briefcase, Plus, UserPlus,
    ChevronRight, Clock, LayoutGrid,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'HR', href: '/hr' }];

const SECTIONS = [
    { title: 'Staff Directory',      href: '/hr/staff',       description: 'View and manage employees & contractors', icon: Users,     color: 'bg-sky-100 text-sky-700' },
    { title: 'Leave Management',     href: '/hr/leave',       description: 'Approve and track leave requests',        icon: Calendar,  color: 'bg-emerald-100 text-emerald-700' },
    { title: 'Performance Reviews',  href: '/hr/performance', description: 'Manage reviews and goals',               icon: Star,      color: 'bg-amber-100 text-amber-700' },
    { title: 'Recruitment',         href: '/hr/recruitment', description: 'Open roles and applicant tracking',       icon: Briefcase, color: 'bg-violet-100 text-violet-700' },
];

const QUICK_ACTIONS = [
    { label: 'Add Staff Member',      href: '/hr/staff/create',   icon: UserPlus },
    { label: 'Create Leave Request',  href: '/hr/leave/create',   icon: Calendar },
    { label: 'Post a Job',            href: '/hr/recruitment',    icon: Briefcase },
];

export default function HRIndexPage() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Human Resources" />
            <div className="flex flex-col h-full">

                {/* Header */}
                <div className="bg-card border-b border-border">
                    <div className="flex items-center gap-3 px-6 py-3.5">
                        <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                            <Users className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-base font-bold tracking-tight">Human Resources</h1>
                            <p className="text-xs text-muted-foreground">Staff, leave, performance and recruitment</p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-auto bg-background p-6 space-y-6">

                    {/* Section cards */}
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {SECTIONS.map(s => (
                            <Link key={s.href} href={s.href}
                                className="group bg-card border border-border rounded-lg p-5 hover:border-primary/40 hover:shadow-sm transition-all">
                                <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center mb-3', s.color)}>
                                    <s.icon className="h-5 w-5" />
                                </div>
                                <div className="flex items-center justify-between mb-1">
                                    <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">{s.title}</h3>
                                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                                </div>
                                <p className="text-xs text-muted-foreground">{s.description}</p>
                            </Link>
                        ))}
                    </div>

                    {/* Bottom row */}
                    <div className="grid sm:grid-cols-3 gap-4">
                        {/* Quick actions */}
                        <div className="bg-card border border-border rounded-lg p-5">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Quick Actions</h3>
                            <div className="space-y-1.5">
                                {QUICK_ACTIONS.map(a => (
                                    <Link key={a.href} href={a.href}
                                        className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors">
                                        <a.icon className="h-3.5 w-3.5 shrink-0" />
                                        {a.label}
                                    </Link>
                                ))}
                            </div>
                        </div>

                        {/* Recent leave requests placeholder */}
                        <div className="bg-card border border-border rounded-lg p-5">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Recent Leave Requests</h3>
                            <div className="flex flex-col items-center justify-center py-6 text-center">
                                <Clock className="h-8 w-8 text-muted-foreground/20 mb-2" />
                                <p className="text-xs text-muted-foreground">No recent requests</p>
                            </div>
                        </div>

                        {/* Team availability placeholder */}
                        <div className="bg-card border border-border rounded-lg p-5">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Team Availability</h3>
                            <div className="flex flex-col items-center justify-center py-6 text-center">
                                <LayoutGrid className="h-8 w-8 text-muted-foreground/20 mb-2" />
                                <p className="text-xs text-muted-foreground">Resource summary will appear here</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
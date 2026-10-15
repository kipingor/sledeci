import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { type BreadcrumbItem } from '@/types';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    UserPlus, Search, Building2, Mail, Calendar, CheckCircle2,
    Clock, Users, Bell, TrendingUp, Sparkles, AlertTriangle,
    MoreHorizontal, ArrowRight, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Contacts', href: '/contacts' }];

const STATUS: Record<string, { label: string; dot: string; pill: string }> = {
    new:          { label: 'New',          dot: 'bg-slate-400',    pill: 'bg-slate-50 text-slate-700 ring-slate-200' },
    email_sent:   { label: 'Email Sent',   dot: 'bg-blue-500',     pill: 'bg-blue-50 text-blue-700 ring-blue-200' },
    following_up: { label: 'Following Up', dot: 'bg-amber-500',    pill: 'bg-amber-50 text-amber-700 ring-amber-200' },
    responded:    { label: 'Responded',    dot: 'bg-emerald-500',  pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
    converted:    { label: 'Converted',    dot: 'bg-violet-500',   pill: 'bg-violet-50 text-violet-700 ring-violet-200' },
    dropped:      { label: 'Dropped',      dot: 'bg-red-400',      pill: 'bg-red-50 text-red-600 ring-red-200' },
};

// Consistent avatar color per first letter
function avatarCls(name: string) {
    const palette = [
        'bg-amber-100 text-amber-800', 'bg-violet-100 text-violet-800',
        'bg-sky-100 text-sky-800', 'bg-emerald-100 text-emerald-800',
        'bg-rose-100 text-rose-800', 'bg-blue-100 text-blue-800',
    ];
    return palette[name.charCodeAt(0) % palette.length];
}

interface Contact {
    id: number; name: string; email?: string; phone?: string;
    company?: string; role?: string; event_name?: string; met_at?: string;
    status: string; follow_up_count: number; next_follow_up_at?: string;
    key_topics?: string[];
    lead?: { id: number; title: string } | null;
}

interface Props {
    contacts: { data: Contact[]; meta: any };
    counts: { total: number; new: number; in_progress: number; responded: number; converted: number; due_today: number };
}

export default function ContactsIndex({ contacts, counts }: Props) {
    const [search, setSearch]           = useState('');
    const [activeStatus, setActiveStatus] = useState('');

    function filterStatus(status: string) {
        const next = activeStatus === status ? '' : status;
        setActiveStatus(next);
        router.get('/contacts', { status: next, search }, { preserveState: true, replace: true });
    }

    function onSearch(e: React.FormEvent) {
        e.preventDefault();
        router.get('/contacts', { status: activeStatus, search }, { preserveState: true, replace: true });
    }

    function isOverdue(c: Contact) {
        if (!c.next_follow_up_at) return false;
        return new Date(c.next_follow_up_at) < new Date() && !['converted', 'dropped'].includes(c.status);
    }

    const statusTabs = [
        { key: '',           label: 'All Contacts' },
        ...Object.entries(STATUS).map(([k, v]) => ({ key: k, label: v.label })),
    ];

    const statStrip = [
        { key: '',           label: 'Total',       value: counts.total,       icon: Users,        color: 'text-foreground' },
        { key: 'new',        label: 'New',         value: counts.new,         icon: UserPlus,     color: 'text-primary' },
        { key: 'email_sent', label: 'In Progress', value: counts.in_progress, icon: Clock,        color: 'text-blue-600' },
        { key: 'responded',  label: 'Responded',   value: counts.responded,   icon: CheckCircle2, color: 'text-emerald-600' },
        { key: 'converted',  label: 'Converted',   value: counts.converted,   icon: TrendingUp,   color: 'text-violet-600' },
        { key: '',           label: 'Due Today',   value: counts.due_today,   icon: Bell,         color: counts.due_today > 0 ? 'text-rose-600' : 'text-foreground' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Contacts" />
            <div className="flex flex-col h-full">

                {/* ── Header ── */}
                <div className="bg-card border-b border-border">

                    {/* Title bar */}
                    <div className="flex items-center justify-between px-6 py-3.5 border-b border-border/60">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                                <Users className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-base font-bold tracking-tight">Networking Contacts</h1>
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Sparkles className="h-3 w-3 text-primary" />
                                    AI drafts personalised emails and plans your follow-up trail
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {counts.due_today > 0 && (
                                <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    {counts.due_today} overdue
                                </div>
                            )}
                            <Button
                                size="sm"
                                className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                                asChild
                            >
                                <Link href="/contacts/create">
                                    <UserPlus className="h-3.5 w-3.5" /> Add Contact
                                </Link>
                            </Button>
                        </div>
                    </div>

                    {/* Stats strip */}
                    <div className="flex divide-x divide-border/60 border-b border-border/60">
                        {statStrip.map((s, i) => (
                            <button
                                key={i}
                                onClick={() => s.key && filterStatus(s.key)}
                                className={cn(
                                    'flex-1 px-4 py-2.5 text-left transition-colors',
                                    s.key ? 'hover:bg-muted/40 cursor-pointer' : 'cursor-default',
                                    activeStatus === s.key && s.key ? 'bg-primary/5' : ''
                                )}
                            >
                                <div className="flex items-center gap-1.5 mb-0.5">
                                    <s.icon className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</span>
                                </div>
                                <p className={cn('text-xl font-bold tabular-nums leading-none', s.color)}>{s.value}</p>
                            </button>
                        ))}
                    </div>

                    {/* Status tab bar */}
                    <div className="flex items-center px-4 overflow-x-auto border-b border-border/60">
                        {statusTabs.map(tab => (
                            <button
                                key={tab.key + tab.label}
                                onClick={() => filterStatus(tab.key)}
                                className={cn(
                                    'px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-colors',
                                    activeStatus === tab.key ? 'sf-tab-active' : 'sf-tab-inactive'
                                )}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Search bar */}
                    <form onSubmit={onSearch} className="px-4 py-2">
                        <div className="relative max-w-sm">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                                placeholder="Search name, company, email…"
                                className="pl-8 h-7 text-xs"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                    </form>
                </div>

                {/* ── Contact list ── */}
                <div className="flex-1 overflow-auto bg-background">
                    {contacts.data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground/20" />
                            <p className="font-medium text-muted-foreground">No contacts found</p>
                            <p className="text-xs text-muted-foreground/60 mt-1 mb-5">
                                Add your first networking contact and let AI handle the follow-up
                            </p>
                            <Button size="sm" asChild>
                                <Link href="/contacts/create">
                                    <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Add Contact
                                </Link>
                            </Button>
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-muted/40 border-b border-border">
                                    {['Contact', 'Status', 'Company / Role', 'Touchpoints', 'Next Follow-up', 'Linked Lead', ''].map(h => (
                                        <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {contacts.data.map(contact => {
                                    const cfg     = STATUS[contact.status] ?? STATUS.new;
                                    const overdue = isOverdue(contact);
                                    const avCls   = avatarCls(contact.name);

                                    return (
                                        <tr
                                            key={contact.id}
                                            className={cn(
                                                'group transition-colors cursor-pointer',
                                                overdue ? 'bg-amber-50/40 hover:bg-amber-50/70' : 'hover:bg-muted/40'
                                            )}
                                            onClick={() => router.visit(`/contacts/${contact.id}`)}
                                        >
                                            {/* Contact name + avatar */}
                                            <td className="px-4 py-2.5">
                                                <div className="flex items-center gap-2.5">
                                                    <Avatar className="h-7 w-7 shrink-0">
                                                        <AvatarFallback className={cn('text-[11px] font-bold', avCls)}>
                                                            {contact.name.charAt(0).toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">
                                                            {contact.name}
                                                        </p>
                                                        {contact.email && (
                                                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                                <Mail className="h-3 w-3" />
                                                                {contact.email}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Status */}
                                            <td className="px-4 py-2.5">
                                                <div className="space-y-0.5">
                                                    <span className={cn(
                                                        'inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ring-1',
                                                        cfg.pill
                                                    )}>
                                                        <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />
                                                        {cfg.label}
                                                    </span>
                                                    {overdue && (
                                                        <div className="flex items-center gap-1 text-[11px] text-amber-600">
                                                            <AlertTriangle className="h-3 w-3" />
                                                            Overdue
                                                        </div>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Company / role */}
                                            <td className="px-4 py-2.5">
                                                {contact.company ? (
                                                    <div>
                                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                            <Building2 className="h-3 w-3 shrink-0" />
                                                            {contact.company}
                                                        </p>
                                                        {contact.role && (
                                                            <p className="text-xs text-muted-foreground/60 mt-0.5 pl-4">{contact.role}</p>
                                                        )}
                                                    </div>
                                                ) : <span className="text-xs text-muted-foreground/30">—</span>}
                                            </td>

                                            {/* Touchpoints */}
                                            <td className="px-4 py-2.5">
                                                <span className="text-xs text-muted-foreground">
                                                    {contact.follow_up_count > 0
                                                        ? `${contact.follow_up_count} email${contact.follow_up_count !== 1 ? 's' : ''}`
                                                        : <span className="text-muted-foreground/30">None yet</span>}
                                                </span>
                                            </td>

                                            {/* Next follow-up */}
                                            <td className="px-4 py-2.5">
                                                {contact.next_follow_up_at ? (
                                                    <span className={cn(
                                                        'text-xs',
                                                        overdue ? 'text-amber-600 font-medium' : 'text-muted-foreground'
                                                    )}>
                                                        {format(new Date(contact.next_follow_up_at), 'MMM d, yyyy')}
                                                    </span>
                                                ) : <span className="text-xs text-muted-foreground/30">—</span>}
                                            </td>

                                            {/* Linked lead */}
                                            <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                                                {contact.lead ? (
                                                    <Link
                                                        href={`/leads/${contact.lead.id}`}
                                                        className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 ring-1 ring-violet-200 hover:bg-violet-100 transition-colors"
                                                    >
                                                        {contact.lead.title}
                                                    </Link>
                                                ) : <span className="text-xs text-muted-foreground/30">—</span>}
                                            </td>

                                            {/* Actions */}
                                            <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <button className="h-6 w-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-muted transition-all">
                                                            <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                                                        </button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-40 text-sm">
                                                        <DropdownMenuItem onClick={() => router.visit(`/contacts/${contact.id}`)}>
                                                            View Contact
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => router.visit(`/contacts/${contact.id}/edit`)}>
                                                            Edit
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* ── Pagination ── */}
                {contacts.meta?.last_page > 1 && (
                    <div className="flex items-center justify-between px-6 py-2.5 border-t border-border bg-card text-xs text-muted-foreground">
                        <span>Page {contacts.meta.current_page} of {contacts.meta.last_page}</span>
                        <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7"
                                disabled={contacts.meta.current_page === 1}
                                onClick={() => router.visit(`/contacts?page=${contacts.meta.current_page - 1}`)}>
                                <ChevronLeft className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7"
                                disabled={contacts.meta.current_page === contacts.meta.last_page}
                                onClick={() => router.visit(`/contacts?page=${contacts.meta.current_page + 1}`)}>
                                <ChevronRight className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
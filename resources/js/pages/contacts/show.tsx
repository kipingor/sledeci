/**
 * contacts/show.tsx — Amber Obsidian redesign
 * All fetch() API calls preserved exactly (mark-initial-sent, send follow-up,
 * regenerate-email, convert-to-lead). Only the layout and styling are updated.
 */
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { type BreadcrumbItem } from '@/types';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Mail, Phone, Building2, MapPin, Calendar, Sparkles,
    CheckCircle2, Clock, RotateCcw, TrendingUp, Send,
    Tag, ChevronDown, ChevronUp, Edit, User, AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface FollowUp {
    id: number; sequence: number; subject: string; body: string;
    status: 'scheduled' | 'sent' | 'replied' | 'skipped';
    scheduled_at: string; sent_at?: string; reply_notes?: string;
}
interface Contact {
    id: number; name: string; email?: string; phone?: string;
    company?: string; role?: string; event_name?: string; event_location?: string;
    met_at?: string; source?: string; talking_points?: string; notes?: string;
    status: string; follow_up_count: number;
    last_contact_at?: string; next_follow_up_at?: string;
    key_topics?: string[];
    ai_email_draft?: string;
    ai_context_summary?: { summary?: string; pain_points?: string[]; opportunities?: string[]; next_step_suggestion?: string };
    follow_ups: FollowUp[];
    lead?: { id: number; title: string; status: string } | null;
}

const STATUS: Record<string, { label: string; dot: string; pill: string }> = {
    new:          { label: 'New',          dot: 'bg-slate-400',   pill: 'bg-slate-50 text-slate-700 ring-slate-200' },
    email_sent:   { label: 'Email Sent',   dot: 'bg-blue-500',    pill: 'bg-blue-50 text-blue-700 ring-blue-200' },
    following_up: { label: 'Following Up', dot: 'bg-amber-500',   pill: 'bg-amber-50 text-amber-700 ring-amber-200' },
    responded:    { label: 'Responded',    dot: 'bg-emerald-500', pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
    converted:    { label: 'Converted',    dot: 'bg-violet-500',  pill: 'bg-violet-50 text-violet-700 ring-violet-200' },
    dropped:      { label: 'Dropped',      dot: 'bg-red-400',     pill: 'bg-red-50 text-red-600 ring-red-200' },
};
const FU_STATUS: Record<string, { label: string; icon: React.ComponentType<any>; pill: string }> = {
    scheduled: { label: 'Scheduled', icon: Clock,         pill: 'bg-amber-50 text-amber-700 ring-amber-200' },
    sent:      { label: 'Sent',      icon: Send,          pill: 'bg-blue-50 text-blue-700 ring-blue-200' },
    replied:   { label: 'Replied',   icon: CheckCircle2,  pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
    skipped:   { label: 'Skipped',   icon: ChevronDown,   pill: 'bg-gray-50 text-gray-500 ring-gray-200' },
};

function avCls(name: string) {
    const p = ['bg-amber-100 text-amber-800','bg-violet-100 text-violet-800','bg-sky-100 text-sky-800','bg-emerald-100 text-emerald-800'];
    return p[name.charCodeAt(0) % p.length];
}

function csrfToken() {
    return (document.querySelector('meta[name=csrf-token]') as any)?.content ?? '';
}

export default function ContactShow() {
    const { props } = usePage<{ contact: Contact }>();
    const [contact,       setContact]       = useState(props.contact);
    const [emailDraft,    setEmailDraft]    = useState(contact.ai_email_draft ?? '');
    const [tone,          setTone]          = useState('professional');
    const [regenLoading,  setRegenLoading]  = useState(false);
    const [sendingId,     setSendingId]     = useState<number | null>(null);
    const [sendingInit,   setSendingInit]   = useState(false);
    const [converting,    setConverting]    = useState(false);
    const [expandedFU,    setExpandedFU]    = useState<number | null>(null);
    const [activeTab,     setActiveTab]     = useState<'email' | 'followups' | 'insights'>('email');

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Contacts', href: '/contacts' },
        { title: contact.name, href: `/contacts/${contact.id}` },
    ];

    const cfg    = STATUS[contact.status] ?? STATUS.new;
    const isOverdue = contact.next_follow_up_at
        && new Date(contact.next_follow_up_at) < new Date()
        && !['converted', 'dropped'].includes(contact.status);
    const sentCount = contact.follow_ups.filter(f => f.status !== 'scheduled').length;

    // ── API calls (all preserved from original) ────────────────────────────
    async function regenerateEmail() {
        setRegenLoading(true);
        try {
            const res = await fetch(`/contacts/${contact.id}/regenerate-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken() },
                body: JSON.stringify({ tone }),
            });
            const data = await res.json();
            if (data.draft) setEmailDraft(data.draft);
        } finally { setRegenLoading(false); }
    }

    async function markInitialSent() {
        setSendingInit(true);
        try {
            const res = await fetch(`/contacts/${contact.id}/mark-initial-sent`, {
                method: 'POST',
                headers: { 'X-CSRF-TOKEN': csrfToken() },
            });
            const data = await res.json();
            if (data.success) setContact(c => ({ ...c, status: data.status }));
        } finally { setSendingInit(false); }
    }

    async function sendFollowUp(followUp: FollowUp) {
        setSendingId(followUp.id);
        try {
            const res = await fetch(`/contacts/${contact.id}/follow-ups/${followUp.id}/send`, {
                method: 'POST',
                headers: { 'X-CSRF-TOKEN': csrfToken() },
            });
            const data = await res.json();
            if (data.success) {
                setContact(c => ({
                    ...c, status: data.status,
                    follow_ups: c.follow_ups.map(f => f.id === followUp.id ? { ...f, status: 'sent' as const } : f),
                }));
            }
        } finally { setSendingId(null); }
    }

    async function convertToLead() {
        setConverting(true);
        try {
            const res = await fetch(`/contacts/${contact.id}/convert-to-lead`, {
                method: 'POST',
                headers: { 'X-CSRF-TOKEN': csrfToken() },
            });
            const data = await res.json();
            if (data.lead_url) router.visit(data.lead_url);
        } finally { setConverting(false); }
    }

    const tabs = [
        { id: 'email',    label: 'Outreach Email' },
        { id: 'followups',label: `Follow-up Trail (${sentCount}/${contact.follow_ups.length})` },
        { id: 'insights', label: 'AI Insights' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={contact.name} />
            <div className="flex flex-col h-full">

                {/* ── Record header ── */}
                <div className="bg-card border-b border-border">
                    <div className="px-6 pt-5 pb-0">
                        <div className="flex items-start justify-between gap-4 mb-3">
                            <div className="flex items-center gap-3 min-w-0">
                                <Avatar className="h-12 w-12 shrink-0">
                                    <AvatarFallback className={cn('text-lg font-bold', avCls(contact.name))}>
                                        {contact.name.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2.5 flex-wrap">
                                        <h1 className="text-xl font-bold tracking-tight">{contact.name}</h1>
                                        <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ring-1', cfg.pill)}>
                                            <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />
                                            {cfg.label}
                                        </span>
                                        {isOverdue && (
                                            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200">
                                                <AlertTriangle className="h-3 w-3" /> Overdue
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                        {contact.role && <span className="text-xs text-muted-foreground">{contact.role}</span>}
                                        {contact.company && (
                                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                <Building2 className="h-3 w-3" />{contact.company}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                {!contact.lead && contact.status !== 'dropped' && (
                                    <Button size="sm" variant="outline" onClick={convertToLead} disabled={converting} className="gap-1.5">
                                        <TrendingUp className="h-3.5 w-3.5" />
                                        {converting ? 'Converting…' : 'Convert to Lead'}
                                    </Button>
                                )}
                                {contact.lead && (
                                    <Button asChild size="sm" variant="outline">
                                        <Link href={`/leads/${contact.lead.id}`}>View Lead</Link>
                                    </Button>
                                )}
                                <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                                    <Link href={`/contacts/${contact.id}/edit`}>
                                        <Edit className="h-3.5 w-3.5 mr-1.5" /> Edit
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Highlights bar */}
                    <div className="flex divide-x divide-border/60 border-t border-border bg-muted/20">
                        {[
                            { label: 'Email',         value: contact.email ?? '—',    icon: Mail },
                            { label: 'Phone',         value: contact.phone ?? '—',    icon: Phone },
                            { label: 'Event',         value: contact.event_name ?? '—', icon: MapPin },
                            { label: 'Met',           value: contact.met_at ? format(new Date(contact.met_at), 'MMM d, yyyy') : '—', icon: Calendar },
                            { label: 'Emails Sent',   value: `${contact.follow_up_count}`, icon: Send },
                        ].map((cell, i) => (
                            <div key={i} className="flex-1 px-4 py-2.5 min-w-0">
                                <div className="flex items-center gap-1 mb-0.5">
                                    <cell.icon className="h-3 w-3 text-muted-foreground shrink-0" />
                                    <span className="record-field-label">{cell.label}</span>
                                </div>
                                <p className="record-field-value truncate">{cell.value}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Body: left tabs + right sidebar ── */}
                <div className="flex flex-1 min-h-0 overflow-hidden">

                    {/* Main tabs */}
                    <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
                        <div className="flex border-b border-border bg-card">
                            {tabs.map(tab => (
                                <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                                    className={cn('px-5 py-3 text-sm font-medium transition-colors whitespace-nowrap',
                                        activeTab === tab.id ? 'sf-tab-active' : 'sf-tab-inactive')}>
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <div className="flex-1 overflow-y-auto bg-card p-5">

                            {/* Outreach email */}
                            {activeTab === 'email' && (
                                <div className="max-w-2xl space-y-4">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <div className="flex items-center gap-1.5 text-sm font-medium text-primary">
                                            <Sparkles className="h-4 w-4" /> Initial Outreach Email
                                        </div>
                                        {contact.status === 'email_sent' && (
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                                                Sent ✓
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground">AI-drafted from your meeting notes. Edit freely before sending.</p>
                                    <Textarea
                                        value={emailDraft}
                                        onChange={e => setEmailDraft(e.target.value)}
                                        rows={10}
                                        className="font-mono text-sm resize-none"
                                        placeholder="AI email draft will appear here…"
                                    />
                                    <div className="flex items-center gap-2 flex-wrap justify-between">
                                        <div className="flex items-center gap-2">
                                            <Select value={tone} onValueChange={setTone}>
                                                <SelectTrigger className="w-36 h-8 text-xs">
                                                    <SelectValue placeholder="Tone" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="professional">Professional</SelectItem>
                                                    <SelectItem value="warm">Warm & Friendly</SelectItem>
                                                    <SelectItem value="concise">Brief & Direct</SelectItem>
                                                    <SelectItem value="formal">Formal</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <Button variant="outline" size="sm" onClick={regenerateEmail} disabled={regenLoading} className="gap-1.5 h-8 text-xs">
                                                <RotateCcw className={cn('h-3 w-3', regenLoading && 'animate-spin')} />
                                                Regenerate
                                            </Button>
                                        </div>
                                        <div className="flex gap-2">
                                            {contact.email && (
                                                <Button asChild size="sm" variant="outline" className="gap-1.5 h-8 text-xs">
                                                    <a href={`mailto:${contact.email}?body=${encodeURIComponent(emailDraft)}`} target="_blank">
                                                        <Mail className="h-3 w-3" /> Open in Mail
                                                    </a>
                                                </Button>
                                            )}
                                            <Button size="sm" onClick={markInitialSent}
                                                disabled={sendingInit || contact.status === 'email_sent'}
                                                className="gap-1.5 h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90">
                                                <Send className="h-3 w-3" />
                                                {contact.status === 'email_sent' ? 'Sent ✓' : sendingInit ? 'Marking…' : 'Mark as Sent'}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Follow-up trail */}
                            {activeTab === 'followups' && (
                                <div className="max-w-2xl space-y-3">
                                    <p className="text-xs text-muted-foreground">
                                        {contact.follow_ups.length} follow-up emails · {sentCount} sent so far
                                    </p>
                                    {contact.follow_ups.length === 0 && (
                                        <p className="text-sm text-muted-foreground text-center py-10">No follow-ups scheduled yet.</p>
                                    )}
                                    {contact.follow_ups.map((fu, i) => {
                                        const fCfg    = FU_STATUS[fu.status] ?? FU_STATUS.scheduled;
                                        const Icon    = fCfg.icon;
                                        const isExp   = expandedFU === fu.id;
                                        const overdue = fu.status === 'scheduled' && new Date(fu.scheduled_at) < new Date();
                                        return (
                                            <div key={fu.id} className={cn('border rounded-lg overflow-hidden', overdue ? 'border-amber-200' : 'border-border')}>
                                                <button
                                                    className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/30 transition-colors"
                                                    onClick={() => setExpandedFU(isExp ? null : fu.id)}
                                                >
                                                    <span className={cn(
                                                        'h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0',
                                                        i < 2 ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                                                    )}>{fu.sequence}</span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium truncate">{fu.subject}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {format(new Date(fu.scheduled_at), 'MMM d, yyyy')}
                                                            {overdue && <span className="text-amber-600 ml-1">— overdue</span>}
                                                        </p>
                                                    </div>
                                                    <span className={cn('inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ring-1', fCfg.pill)}>
                                                        <Icon className="h-3 w-3" />{fCfg.label}
                                                    </span>
                                                    {isExp ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                                                </button>
                                                {isExp && (
                                                    <div className="border-t border-border p-3 bg-muted/20 space-y-3">
                                                        <Textarea defaultValue={fu.body} rows={5} className="text-sm font-mono bg-card resize-none" />
                                                        <div className="flex gap-2 justify-end flex-wrap">
                                                            {contact.email && (
                                                                <Button asChild size="sm" variant="outline" className="gap-1.5 h-7 text-xs">
                                                                    <a href={`mailto:${contact.email}?subject=${encodeURIComponent(fu.subject)}&body=${encodeURIComponent(fu.body)}`} target="_blank">
                                                                        <Mail className="h-3 w-3" /> Open in Mail
                                                                    </a>
                                                                </Button>
                                                            )}
                                                            {fu.status === 'scheduled' && (
                                                                <Button size="sm" onClick={() => sendFollowUp(fu)} disabled={sendingId === fu.id}
                                                                    className="gap-1.5 h-7 text-xs bg-primary text-primary-foreground hover:bg-primary/90">
                                                                    <Send className="h-3 w-3" />
                                                                    {sendingId === fu.id ? 'Marking…' : 'Mark as Sent'}
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* AI Insights */}
                            {activeTab === 'insights' && (
                                <div className="max-w-xl space-y-4">
                                    {!contact.ai_context_summary ? (
                                        <p className="text-sm text-muted-foreground text-center py-10">No AI insights available yet.</p>
                                    ) : (
                                        <>
                                            {contact.ai_context_summary.summary && (
                                                <p className="text-sm text-foreground leading-relaxed">{contact.ai_context_summary.summary}</p>
                                            )}
                                            {(contact.ai_context_summary.pain_points ?? []).length > 0 && (
                                                <div>
                                                    <p className="record-field-label mb-2">Pain Points</p>
                                                    <ul className="space-y-1.5">
                                                        {(contact.ai_context_summary.pain_points ?? []).map((p, i) => (
                                                            <li key={i} className="text-sm text-muted-foreground flex gap-2">
                                                                <span className="text-red-400 mt-0.5 shrink-0">•</span>{p}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                            {(contact.ai_context_summary.opportunities ?? []).length > 0 && (
                                                <div>
                                                    <p className="record-field-label mb-2">Opportunities</p>
                                                    <ul className="space-y-1.5">
                                                        {(contact.ai_context_summary.opportunities ?? []).map((o, i) => (
                                                            <li key={i} className="text-sm text-muted-foreground flex gap-2">
                                                                <span className="text-emerald-500 mt-0.5 shrink-0">•</span>{o}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                            {contact.ai_context_summary.next_step_suggestion && (
                                                <div className="p-3.5 rounded-lg bg-primary/5 border border-primary/20">
                                                    <p className="text-xs font-semibold text-primary mb-1">Suggested Next Step</p>
                                                    <p className="text-sm text-foreground">{contact.ai_context_summary.next_step_suggestion}</p>
                                                </div>
                                            )}
                                        </>
                                    )}
                                    {contact.talking_points && (
                                        <div className="pt-4 border-t border-border">
                                            <p className="record-field-label mb-2">Meeting Notes</p>
                                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{contact.talking_points}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right sidebar */}
                    <div className="w-60 shrink-0 border-l border-border bg-muted/20 p-4 space-y-4 overflow-y-auto">
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Contact</p>
                            <div className="space-y-1.5">
                                {contact.email && (
                                    <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary p-1.5 rounded hover:bg-muted/60 transition-colors">
                                        <Mail className="h-3.5 w-3.5 shrink-0" />
                                        <span className="truncate">{contact.email}</span>
                                    </a>
                                )}
                                {contact.phone && (
                                    <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary p-1.5 rounded hover:bg-muted/60 transition-colors">
                                        <Phone className="h-3.5 w-3.5 shrink-0" />
                                        <span className="truncate">{contact.phone}</span>
                                    </a>
                                )}
                            </div>
                        </div>
                        {contact.key_topics && contact.key_topics.length > 0 && (
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                                    <Tag className="h-3 w-3" /> Key Topics
                                </p>
                                <div className="flex gap-1.5 flex-wrap">
                                    {contact.key_topics.map(t => (
                                        <span key={t} className="text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full">
                                            {t}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {contact.next_follow_up_at && contact.status !== 'converted' && (
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Next Follow-up</p>
                                <p className={cn('text-sm font-medium', isOverdue ? 'text-amber-600' : 'text-foreground')}>
                                    {format(new Date(contact.next_follow_up_at), 'MMM d, yyyy')}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
import { Link } from '@inertiajs/react';
import { Badge } from '@/components/ui/badge';
import { Send, Inbox } from 'lucide-react';
import { format } from 'date-fns';

const STATUS: Record<string, { label: string; cls: string }> = {
    draft:     { label: 'Draft',     cls: 'bg-gray-100 text-gray-600' },
    queued:    { label: 'Queued',    cls: 'bg-amber-100 text-amber-700' },
    sent:      { label: 'Sent',      cls: 'bg-blue-100 text-blue-700' },
    delivered: { label: 'Delivered', cls: 'bg-emerald-100 text-emerald-700' },
    opened:    { label: 'Opened',    cls: 'bg-violet-100 text-violet-700' },
    clicked:   { label: 'Clicked',   cls: 'bg-violet-100 text-violet-700' },
    bounced:   { label: 'Bounced',   cls: 'bg-red-100 text-red-700' },
    failed:    { label: 'Failed',    cls: 'bg-red-100 text-red-700' },
    received:  { label: 'Received',  cls: 'bg-sky-100 text-sky-700' },
};

interface Email {
    id: number;
    subject: string;
    to: string;
    from: string | null;
    from_name: string | null;
    direction: 'inbound' | 'outbound';
    status: string;
    body: string | null;
    body_plain: string | null;
    sent_at: string | null;
    received_at: string | null;
    created_at: string;
    lead: { id: number; title: string; status: string } | null;
    opportunity: { id: number; title: string } | null;
    sender: { id: number; name: string } | null;
}

interface Props {
    email: Email;
}

export default function EmailCard({ email }: Props) {
    const isInbound = email.direction === 'inbound';
    const statusCfg = STATUS[email.status] ?? { label: email.status, cls: 'bg-gray-100 text-gray-500' };
    const dateStamp = email.sent_at ?? email.received_at ?? email.created_at;
    const displayName = isInbound
        ? (email.from_name ?? email.from ?? 'Unknown')
        : email.to;
    const subject = email.subject || '(no subject)';

    return (
        <Link href={`/emails/${email.id}`}
            className="block p-4 bg-card border border-border rounded-lg hover:border-primary/30 transition-colors">
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm truncate">{subject}</p>
                        <Badge className={`capitalize text-xs ${statusCfg.cls}`}>{statusCfg.label}</Badge>
                        <Badge variant="outline" className="text-xs capitalize">
                            {isInbound
                                ? <><Inbox className="h-3 w-3 mr-1 inline" />Inbound</>
                                : <><Send className="h-3 w-3 mr-1 inline" />Outbound</>}
                        </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                        {isInbound ? 'From: ' : 'To: '}{displayName}
                        {email.lead && ` • ${email.lead.title}`}
                    </p>
                </div>
                <time className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                    {dateStamp ? format(new Date(dateStamp), 'MMM d, yyyy') : ''}
                </time>
            </div>
        </Link>
    );
}

// ── conversations/index.tsx ──────────────────────────────────────────────────
// (saved as conversations/index.tsx)
import AppLayout from '@/layouts/app-layout';
import { Head, Link, usePage } from '@inertiajs/react';
import { type BreadcrumbItem } from '@/types';
import { MessageSquare, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Conversations', href: '/conversations' }];

export default function ConversationIndex() {
    const { conversations } = usePage().props as any;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Conversations" />
            <div className="flex flex-col h-full">
                <div className="bg-card border-b border-border">
                    <div className="flex items-center justify-between px-6 py-3.5">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center"><MessageSquare className="h-4 w-4 text-primary" /></div>
                            <h1 className="text-base font-bold tracking-tight">Conversations</h1>
                        </div>
                        <Button size="sm" className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90" asChild>
                            <Link href="/conversations/create"><Plus className="h-3.5 w-3.5" /> New</Link>
                        </Button>
                    </div>
                </div>
                <div className="flex-1 overflow-auto bg-background p-5 space-y-2">
                    {conversations?.data?.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                            <MessageSquare className="h-10 w-10 mb-3 opacity-20" />
                            <p>No conversations yet.</p>
                        </div>
                    )}
                    {conversations?.data?.map((c: any) => (
                        <Link key={c.id} href={`/conversations/${c.id}`}
                            className="block p-4 bg-card border border-border rounded-lg hover:border-primary/30 transition-colors">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">{c.lead?.title ?? c.message?.slice(0, 60) ?? 'Conversation'}</p>
                                    {c.message && <p className="text-xs text-muted-foreground truncate mt-0.5">{c.message}</p>}
                                </div>
                                <time className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                                    {c.created_at ? format(new Date(c.created_at), 'MMM d, yyyy') : ''}
                                </time>
                            </div>
                        </Link>
                    ))}
                    {conversations?.meta?.last_page > 1 && (
                        <div className="flex justify-center gap-2 mt-4">
                            {conversations.meta.links?.map((link: any, i: number) =>
                                link.url ? (
                                    <Link key={i} href={link.url}
                                        className={`px-3 py-1 rounded text-xs border ${link.active ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted border-border'}`}
                                        dangerouslySetInnerHTML={{ __html: link.label }} />
                                ) : (
                                    <span key={i} className="px-3 py-1 rounded text-xs border border-border text-muted-foreground" dangerouslySetInnerHTML={{ __html: link.label }} />
                                )
                            )}
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
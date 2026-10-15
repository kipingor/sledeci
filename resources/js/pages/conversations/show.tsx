import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import { format } from 'date-fns';

export default function ConversationShow({ conversation, messages }: any) {
    return (
        <AppLayout breadcrumbs={[{ title: 'Conversations', href: '/conversations' }, { title: conversation?.title ?? 'Conversation', href: '#' }]}>
            <Head title={conversation?.title ?? 'Conversation'} />
            <div className="flex flex-col h-full">
                <div className="bg-card border-b border-border px-6 py-4">
                    <h1 className="text-xl font-bold tracking-tight">{conversation?.title ?? 'Conversation'}</h1>
                </div>
                <div className="flex-1 overflow-auto bg-background p-6 max-w-3xl space-y-3">
                    {(messages ?? []).map((m: any) => (
                        <div key={m.id} className="bg-card border border-border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                                <p className="font-semibold text-sm">{m.user?.name}</p>
                                <time className="text-xs text-muted-foreground">{m.created_at ? format(new Date(m.created_at), 'MMM d, yyyy h:mm a') : ''}</time>
                            </div>
                            <p className="text-sm text-muted-foreground">{m.body}</p>
                        </div>
                    ))}
                    {(!messages || messages.length === 0) && (
                        <p className="text-center text-sm text-muted-foreground py-12">No messages yet.</p>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
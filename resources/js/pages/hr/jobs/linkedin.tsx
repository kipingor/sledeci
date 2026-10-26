import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, Check, Copy, ExternalLink, Linkedin, Send } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

interface Props {
    job: { id: number; title: string; status: string; is_open: boolean; linkedin_posted_at: string | null; linkedin_post_urn: string | null };
    text: string;
    jobUrl: string;
    shareUrl: string;
    apiConfigured: boolean;
    companyUrl: string | null;
}

export default function JobLinkedIn({ job, text, jobUrl, shareUrl, apiConfigured, companyUrl }: Props) {
    const slugPath = jobUrl.split('/careers/')[1]?.split('?')[0] ?? '';
    const [draft, setDraft] = useState(text);
    const [busy, setBusy] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'HR', href: '/hr' },
        { title: 'Jobs', href: '/hr/jobs' },
        { title: job.title, href: `/hr/jobs/${slugPath}/edit` },
        { title: 'LinkedIn', href: `/hr/jobs/${slugPath}/linkedin` },
    ];

    async function copy() {
        try {
            await navigator.clipboard.writeText(draft);
            toast.success('Post copied. Paste it into LinkedIn.');
        } catch {
            toast.error('Could not copy automatically. Select the text and copy it manually.');
        }
    }

    function openLinkedIn() {
        void copy();
        window.open(shareUrl, '_blank', 'noopener,noreferrer');
    }

    const post = () => {
        setBusy(true);
        router.post(`/hr/jobs/${slugPath}/linkedin`, { text: draft }, { preserveScroll: true, onFinish: () => setBusy(false) });
    };

    const markShared = () => router.post(`/hr/jobs/${slugPath}/linkedin/shared`, {}, { preserveScroll: true });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`LinkedIn: ${job.title}`} />

            <div className="border-b border-border bg-card px-6 py-4">
                <Link href="/hr/jobs" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="h-4 w-4" /> Jobs
                </Link>
                <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight">
                    <Linkedin className="h-5 w-5 text-primary" /> Announce on LinkedIn
                </h1>
                <p className="text-sm text-muted-foreground">{job.title}</p>
            </div>

            <div className="mx-auto max-w-3xl space-y-5 p-6">
                {!job.is_open && (
                    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
                        This job is not open on the careers page, so the link in the post would not work. Publish it first.
                    </div>
                )}

                {job.linkedin_posted_at && (
                    <div className="flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 p-4 text-sm text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
                        <Check className="h-4 w-4" /> Announced on {job.linkedin_posted_at}
                        {job.linkedin_post_urn ? ` (post ${job.linkedin_post_urn})` : ''}
                    </div>
                )}

                <div className="space-y-2 rounded-lg border border-border bg-card p-5">
                    <label htmlFor="post-text" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Post text (edit as you like)
                    </label>
                    <textarea id="post-text" rows={10} value={draft} onChange={(e) => setDraft(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                    <p className="text-xs text-muted-foreground">
                        {draft.length} / 3000 characters. The link carries a LinkedIn tag, so applications from the post are labelled &quot;via LinkedIn&quot;.
                    </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-3 rounded-lg border border-border bg-card p-5">
                        <h2 className="font-semibold">Share it yourself</h2>
                        <p className="text-sm text-muted-foreground">Copies the text, then opens LinkedIn&apos;s share window for you to review and post.</p>
                        <div className="flex flex-wrap gap-2">
                            <Button type="button" variant="outline" onClick={copy}>
                                <Copy className="mr-2 h-4 w-4" /> Copy text
                            </Button>
                            <Button type="button" onClick={openLinkedIn} disabled={!job.is_open}>
                                <ExternalLink className="mr-2 h-4 w-4" /> Open LinkedIn
                            </Button>
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={markShared}>
                            I have shared it
                        </Button>
                    </div>

                    <div className="space-y-3 rounded-lg border border-border bg-card p-5">
                        <h2 className="font-semibold">Post automatically</h2>
                        {apiConfigured ? (
                            <>
                                <p className="text-sm text-muted-foreground">Publishes this text from the connected LinkedIn account.</p>
                                <Button type="button" onClick={post} disabled={busy || !job.is_open || draft.trim() === ''}>
                                    <Send className="mr-2 h-4 w-4" /> {busy ? 'Posting…' : 'Post to LinkedIn'}
                                </Button>
                            </>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                Not connected. An administrator can enable this by setting <code>LINKEDIN_ACCESS_TOKEN</code> and <code>LINKEDIN_AUTHOR_URN</code> in the server environment. Until
                                then, use &quot;Share it yourself&quot;.
                            </p>
                        )}
                    </div>
                </div>

                {companyUrl && (
                    <p className="text-sm text-muted-foreground">
                        Company page:{' '}
                        <a href={companyUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            {companyUrl}
                        </a>
                    </p>
                )}
            </div>
        </AppLayout>
    );
}

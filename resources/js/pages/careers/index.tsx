import { Head, Link } from '@inertiajs/react';
import { ArrowRight, Briefcase, Clock, Linkedin, MapPin } from 'lucide-react';
import PublicLayout from '@/components/site/public-layout';
import { Button } from '@/components/ui/button';
import { contact } from '@/routes';
import * as careers from '@/routes/careers';

interface Job {
    id: number;
    title: string;
    slug: string;
    department: string | null;
    location: string | null;
    is_remote: boolean;
    employment_type: string;
    summary: string | null;
    published_at: string | null;
    closes_at: string | null;
}

interface Props {
    jobs: Job[];
    departments: string[];
    filters: { department: string | null };
    linkedin: string | null;
}

export default function CareersIndex({ jobs, departments, filters, linkedin }: Props) {
    return (
        <PublicLayout>
            <Head title="Careers" />

            <section className="border-b border-border bg-gradient-to-b from-primary/5 to-background">
                <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
                    <h1 className="text-4xl font-bold tracking-tight">Build the future of business software</h1>
                    <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">Join a team that cares about getting the details right. Here is where we are hiring.</p>
                    {linkedin && (
                        <Button asChild variant="outline" size="sm" className="mt-5">
                            <a href={linkedin} target="_blank" rel="noopener noreferrer">
                                <Linkedin className="mr-2 h-4 w-4" /> Follow us on LinkedIn
                            </a>
                        </Button>
                    )}
                </div>
            </section>

            <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
                {departments.length > 1 && (
                    <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Filter by department">
                        <Link
                            href={careers.index().url}
                            className={`rounded-full border px-3 py-1 text-sm ${!filters.department ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-muted'}`}
                        >
                            All
                        </Link>
                        {departments.map((d) => (
                            <Link
                                key={d}
                                href={careers.index({ query: { department: d } }).url}
                                className={`rounded-full border px-3 py-1 text-sm ${filters.department === d ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-muted'}`}
                            >
                                {d}
                            </Link>
                        ))}
                    </div>
                )}

                {jobs.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border p-10 text-center">
                        <h2 className="text-lg font-semibold">No open roles right now</h2>
                        <p className="mt-2 text-muted-foreground">We are not hiring at the moment, but we would still like to hear from you.</p>
                        <Button asChild className="mt-4">
                            <Link href={contact().url}>Get in touch</Link>
                        </Button>
                    </div>
                ) : (
                    <ul className="space-y-4">
                        {jobs.map((job) => (
                            <li key={job.id}>
                                <Link
                                    href={careers.show(job.slug).url}
                                    className="group block rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/50"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <h2 className="text-lg font-semibold group-hover:text-primary">{job.title}</h2>
                                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                                {job.department && (
                                                    <span className="inline-flex items-center gap-1">
                                                        <Briefcase className="h-3.5 w-3.5" /> {job.department}
                                                    </span>
                                                )}
                                                {(job.is_remote || job.location) && (
                                                    <span className="inline-flex items-center gap-1">
                                                        <MapPin className="h-3.5 w-3.5" /> {job.is_remote ? 'Remote' : job.location}
                                                    </span>
                                                )}
                                                <span className="inline-flex items-center gap-1">
                                                    <Clock className="h-3.5 w-3.5" /> {job.employment_type}
                                                </span>
                                            </div>
                                            {job.summary && <p className="mt-3 text-sm text-muted-foreground">{job.summary}</p>}
                                        </div>
                                        <ArrowRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
                                    </div>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </PublicLayout>
    );
}

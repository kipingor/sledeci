import { Head, Link, usePage } from '@inertiajs/react';
import { Eye, HeartHandshake, ShieldCheck, Target } from 'lucide-react';
import PublicLayout from '@/components/site/public-layout';
import { Button } from '@/components/ui/button';
import { contact } from '@/routes';
import * as careers from '@/routes/careers';
import type { SharedData } from '@/types';

// Edit this copy to tell your own story. Nothing here is loaded from the database.
const values = [
    { icon: Target, title: 'Built around real work', text: 'We design from how teams actually quote, deliver, invoice and pay, not from how software usually assumes they do.' },
    { icon: ShieldCheck, title: 'Careful with money and data', text: 'Ledgers balance, posted records stay immutable, and access follows the role a person actually holds.' },
    { icon: Eye, title: 'Clear by default', text: 'Every figure can be traced back to the invoice, payment or journal entry behind it.' },
    { icon: HeartHandshake, title: 'Partners, not vendors', text: 'We work alongside customers through setup, training and growth.' },
];

export default function About() {
    const { name } = usePage<SharedData>().props;

    return (
        <PublicLayout>
            <Head title="About us" />

            <section className="border-b border-border bg-gradient-to-b from-primary/5 to-background">
                <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-20">
                    <h1 className="text-4xl font-bold tracking-tight">About {name}</h1>
                    <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
                        We make business software for companies that have outgrown spreadsheets but do not want an enterprise system that takes a year to set up.
                    </p>
                </div>
            </section>

            <section className="mx-auto grid max-w-5xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Our mission</h2>
                    <p className="mt-3 text-muted-foreground">
                        To give every growing business one dependable system for winning work, delivering it, getting paid and paying their people, so owners can spend their time running the business instead of reconciling it.
                    </p>
                </div>
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">What we do</h2>
                    <p className="mt-3 text-muted-foreground">
                        {name} brings sales, clients, projects, accounting, payroll, inventory, point of sale and SACCO management together on one platform, with first-class support for Kenyan requirements such as eTIMS invoicing, M-Pesa collections and statutory payroll deductions.
                    </p>
                </div>
            </section>

            <section className="border-t border-border bg-muted/30">
                <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
                    <h2 className="text-center text-2xl font-bold tracking-tight">What we value</h2>
                    <div className="mt-8 grid gap-5 sm:grid-cols-2">
                        {values.map(({ icon: Icon, title, text }) => (
                            <div key={title} className="flex gap-4 rounded-xl border border-border bg-card p-5">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                    <Icon className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="font-semibold">{title}</h3>
                                    <p className="mt-1 text-sm text-muted-foreground">{text}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-4 py-14 text-center sm:px-6">
                <h2 className="text-2xl font-bold tracking-tight">Work with us</h2>
                <p className="text-muted-foreground">Want to use {name}, or help build it?</p>
                <div className="flex flex-wrap justify-center gap-3">
                    <Button asChild>
                        <Link href={contact().url}>Contact us</Link>
                    </Button>
                    <Button asChild variant="outline">
                        <Link href={careers.index().url}>View careers</Link>
                    </Button>
                </div>
            </section>
        </PublicLayout>
    );
}

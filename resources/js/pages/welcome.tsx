import { Head, Link } from '@inertiajs/react';
import { ArrowRight, Banknote, Boxes, Building2, Landmark, LineChart, Users } from 'lucide-react';
import PublicLayout from '@/components/site/public-layout';
import { Button } from '@/components/ui/button';
import { contact, register, solutions } from '@/routes';
import * as careers from '@/routes/careers';

interface Props {
    canRegister?: boolean;
    openRoles?: number;
}

const highlights = [
    { icon: LineChart, title: 'Sales & clients', text: 'Leads, pipeline, proposals and client follow-ups in one place.' },
    { icon: Banknote, title: 'Accounting', text: 'Invoices, payments, expenses and financial statements that stay in step with the ledger.' },
    { icon: Users, title: 'People & payroll', text: 'Staff records, leave, payslips and recruitment, built for Kenyan statutory deductions.' },
    { icon: Boxes, title: 'Stock & point of sale', text: 'Inventory, suppliers, purchase orders, deliveries and a counter-ready POS.' },
    { icon: Building2, title: 'Projects & tenders', text: 'Plan delivery, track time and risk, and respond to tenders and RFPs.' },
    { icon: Landmark, title: 'SACCO', text: 'Members, savings, loans and dividends for cooperative societies.' },
];

export default function Welcome({ canRegister = true, openRoles = 0 }: Props) {
    return (
        <PublicLayout canRegister={canRegister}>
            <Head title="Run your whole business on one platform" />

            <section className="border-b border-border bg-gradient-to-b from-primary/5 to-background">
                <div className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6 sm:py-28">
                    <p className="mb-4 inline-block rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                        Built for growing businesses in Kenya
                    </p>
                    <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
                        One platform to run sales, projects, finance, people and stock
                    </h1>
                    <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
                        Stop juggling spreadsheets and disconnected tools. Quote, deliver, invoice, get paid and pay your team from a single system your whole company shares.
                    </p>
                    <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                        {canRegister && (
                            <Button asChild size="lg">
                                <Link href={register().url}>
                                    Get started <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        )}
                        <Button asChild size="lg" variant="outline">
                            <Link href={solutions().url}>Explore solutions</Link>
                        </Button>
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
                <h2 className="text-center text-2xl font-bold tracking-tight">Everything your team works from</h2>
                <p className="mx-auto mt-2 max-w-2xl text-center text-muted-foreground">Each area works on its own and shares the same customers, projects and books.</p>
                <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {highlights.map(({ icon: Icon, title, text }) => (
                        <div key={title} className="rounded-xl border border-border bg-card p-5">
                            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <Icon className="h-5 w-5" />
                            </div>
                            <h3 className="font-semibold">{title}</h3>
                            <p className="mt-1 text-sm text-muted-foreground">{text}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="border-t border-border bg-muted/30">
                <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-14 text-center sm:px-6">
                    {openRoles > 0 ? (
                        <>
                            <h2 className="text-2xl font-bold tracking-tight">
                                We are hiring: {openRoles} open {openRoles === 1 ? 'role' : 'roles'}
                            </h2>
                            <p className="max-w-xl text-muted-foreground">Join the team building software for the way African businesses really work.</p>
                            <Button asChild>
                                <Link href={careers.index().url}>See open roles</Link>
                            </Button>
                        </>
                    ) : (
                        <>
                            <h2 className="text-2xl font-bold tracking-tight">Talk to us</h2>
                            <p className="max-w-xl text-muted-foreground">Tell us how your business runs today and we will show you how it could.</p>
                            <Button asChild>
                                <Link href={contact().url}>Contact us</Link>
                            </Button>
                        </>
                    )}
                </div>
            </section>
        </PublicLayout>
    );
}

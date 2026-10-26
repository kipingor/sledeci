import { Head, Link } from '@inertiajs/react';
import { Banknote, Boxes, Briefcase, Building2, Check, Landmark, LineChart, Users } from 'lucide-react';
import PublicLayout from '@/components/site/public-layout';
import { Button } from '@/components/ui/button';
import { contact, register } from '@/routes';

const solutions = [
    {
        icon: LineChart,
        title: 'Sales & CRM',
        text: 'Win more of the work you chase.',
        points: ['Lead capture, import and AI-assisted scoring', 'Pipelines, opportunities and proposals', 'Contacts with follow-up reminders', 'Activity timeline on every record'],
    },
    {
        icon: Building2,
        title: 'Clients',
        text: 'Know every customer at a glance.',
        points: ['Client profiles with projects and history', 'Follow-ups that never slip', 'Client reports with billing and payment summaries', 'Convert a lead or opportunity into a client in one click'],
    },
    {
        icon: Briefcase,
        title: 'Projects & tenders',
        text: 'Deliver on time, and bid with confidence.',
        points: ['Tasks, milestones, dependencies and time logs', 'Risk, issue, change and lessons-learned registers', 'Tender and RFP tracking with AI document analysis', 'Cross-border trade documents'],
    },
    {
        icon: Banknote,
        title: 'Accounting',
        text: 'Books you can trust, always up to date.',
        points: ['Chart of accounts, journals and accounting periods', 'Invoices, payments and expenses that post to the ledger', 'Trial balance, profit & loss, balance sheet and cash flow', 'Multi-currency with exchange rates'],
    },
    {
        icon: Landmark,
        title: 'Kenya compliance & payments',
        text: 'Local requirements handled, not bolted on.',
        points: ['KRA eTIMS invoice submission', 'M-Pesa, Airtel Money and MTN MoMo collections', 'PAYE, SHIF, NSSF, Housing Levy and HELB in payroll', 'Reconcile mobile-money payments to invoices'],
    },
    {
        icon: Users,
        title: 'People & recruitment',
        text: 'From hiring to payslip.',
        points: ['Staff records and leave management', 'Payroll runs with approval and payslips', 'Publish jobs and receive applications online', 'Announce roles on LinkedIn in a click'],
    },
    {
        icon: Boxes,
        title: 'Inventory, procurement & POS',
        text: 'Know what you have and what you sold.',
        points: ['Products, stock levels and valuation', 'Suppliers, purchase orders and deliveries with proof of delivery', 'Point of sale with shifts and cash-up', 'Stock moves automatically with each sale'],
    },
    {
        icon: Landmark,
        title: 'SACCO',
        text: 'Run a cooperative society properly.',
        points: ['Member enrolment, savings and withdrawals', 'Loan applications, approval, disbursement and repayment', 'Dividend distribution', 'Immutable transaction ledger'],
    },
];

export default function Solutions() {
    return (
        <PublicLayout>
            <Head title="Solutions" />

            <section className="border-b border-border bg-gradient-to-b from-primary/5 to-background">
                <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
                    <h1 className="text-4xl font-bold tracking-tight">Solutions for every part of the business</h1>
                    <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
                        Start with the area that hurts most and add the others when you are ready. They all share the same customers, projects and books.
                    </p>
                </div>
            </section>

            <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
                <div className="grid gap-6 md:grid-cols-2">
                    {solutions.map(({ icon: Icon, title, text, points }) => (
                        <article key={title} className="rounded-xl border border-border bg-card p-6">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                    <Icon className="h-5 w-5" />
                                </div>
                                <div>
                                    <h2 className="font-semibold leading-tight">{title}</h2>
                                    <p className="text-sm text-muted-foreground">{text}</p>
                                </div>
                            </div>
                            <ul className="mt-4 space-y-2">
                                {points.map((point) => (
                                    <li key={point} className="flex gap-2 text-sm">
                                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                        <span>{point}</span>
                                    </li>
                                ))}
                            </ul>
                        </article>
                    ))}
                </div>
            </section>

            <section className="border-t border-border bg-muted/30">
                <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-4 py-14 text-center sm:px-6">
                    <h2 className="text-2xl font-bold tracking-tight">Not sure where to start?</h2>
                    <p className="text-muted-foreground">Tell us what your team does today and we will suggest a sensible first step.</p>
                    <div className="flex flex-wrap justify-center gap-3">
                        <Button asChild>
                            <Link href={contact().url}>Talk to us</Link>
                        </Button>
                        <Button asChild variant="outline">
                            <Link href={register().url}>Create an account</Link>
                        </Button>
                    </div>
                </div>
            </section>
        </PublicLayout>
    );
}

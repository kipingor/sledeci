import { Head, Link, usePage } from '@inertiajs/react';
import PublicLayout from '@/components/site/public-layout';
import { contact } from '@/routes';
import type { SharedData } from '@/types';

interface Props {
    legalName: string;
    country: string;
    governingLaw: string;
    updatedAt: string;
}

export default function Terms({ legalName, country, governingLaw, updatedAt }: Props) {
    const { name } = usePage<SharedData>().props;

    const sections: { title: string; body: string[] }[] = [
        {
            title: 'Acceptance of these terms',
            body: [`By creating an account or using ${name} (the "Service"), you agree to these Terms and Conditions. If you use the Service for an organisation, you confirm that you are authorised to bind that organisation. If you do not agree, do not use the Service.`],
        },
        {
            title: 'The Service',
            body: [`${legalName} ("we", "us") provides ${name} as a hosted business-management platform covering areas such as sales, clients, projects, accounting, payroll, inventory, point of sale and recruitment. We may improve, change or retire features, and will give reasonable notice of changes that materially reduce the Service you have paid for.`],
        },
        {
            title: 'Accounts and security',
            body: [
                'You must provide accurate registration details and keep your credentials confidential. You are responsible for all activity under your account, and for assigning roles and permissions to your own users appropriately.',
                'Tell us promptly if you suspect unauthorised access. We may suspend an account to protect the Service or other customers.',
            ],
        },
        {
            title: 'Acceptable use',
            body: ['You must not misuse the Service. In particular, you must not attempt to access another customer\'s data, interfere with or overload the Service, upload malicious code, use the Service for unlawful activity, or resell access without our written agreement.'],
        },
        {
            title: 'Your data and privacy',
            body: [
                'You own the data you put into the Service ("Customer Data"). You give us the limited right to host, process and back it up solely to provide and support the Service.',
                `Where Customer Data includes personal data, you are responsible for having a lawful basis to process it and for complying with applicable data-protection law, including the Data Protection Act, 2019 of ${country} where it applies. We process personal data on your instructions and apply reasonable technical and organisational security measures.`,
                'Job applications submitted through our careers pages are used only to assess candidates for the role applied for and are visible only to authorised recruitment staff.',
            ],
        },
        {
            title: 'Fees and payment',
            body: ['Fees, billing periods and payment methods are set out in your order or plan. Unless stated otherwise, fees are payable in advance, are non-refundable except where required by law, and exclude applicable taxes, which you are responsible for.'],
        },
        {
            title: 'Third-party services and statutory features',
            body: [
                'The Service can connect to third-party services such as KRA eTIMS, mobile-money providers (for example M-Pesa, Airtel Money and MTN MoMo), email, messaging and AI providers. Those services have their own terms, availability and charges, and we are not responsible for them.',
                'Tax, payroll and statutory calculations (including PAYE, SHIF, NSSF, Housing Levy and HELB) depend on rates and rules that change. You are responsible for checking that the configured rates and the resulting figures are correct before filing or paying. The Service does not constitute tax, accounting or legal advice.',
            ],
        },
        {
            title: 'Intellectual property',
            body: ['We and our licensors own the Service, its software and branding. We grant you a limited, non-exclusive, non-transferable right to use the Service during your subscription. These terms do not transfer any intellectual property to you, other than your rights in Customer Data.'],
        },
        {
            title: 'Availability and support',
            body: ['We aim to keep the Service available and will make reasonable efforts to notify you of planned maintenance. We do not guarantee uninterrupted or error-free operation unless a separate service-level agreement says so.'],
        },
        {
            title: 'Disclaimers',
            body: ['Except as expressly stated, the Service is provided "as is" and "as available", and we disclaim all implied warranties to the fullest extent the law allows, including fitness for a particular purpose. AI-generated suggestions and scores are aids to human judgement and may be inaccurate.'],
        },
        {
            title: 'Limitation of liability',
            body: ['To the extent permitted by law, we are not liable for indirect or consequential loss, or for loss of profit, revenue or data. Our total liability arising from the Service in any twelve-month period is limited to the fees you paid us in that period. Nothing limits liability that cannot be limited by law.'],
        },
        {
            title: 'Suspension and termination',
            body: ['You may stop using the Service at any time. We may suspend or end your access if you materially breach these terms or fail to pay, after reasonable notice where practicable. On termination you may export your Customer Data for a reasonable period, after which we may delete it in line with our retention practices.'],
        },
        {
            title: 'Changes to these terms',
            body: ['We may update these terms from time to time. We will post the updated version here and, for material changes, notify account owners. Continued use after the effective date means you accept the changes.'],
        },
        {
            title: 'Governing law',
            body: [`These terms are governed by ${governingLaw}. The courts of ${country} have jurisdiction over any dispute, subject to any mandatory rights you have under the law of your place of residence.`],
        },
    ];

    return (
        <PublicLayout>
            <Head title="Terms & Conditions" />

            <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
                <h1 className="text-4xl font-bold tracking-tight">Terms &amp; Conditions</h1>
                <p className="mt-2 text-sm text-muted-foreground">Last updated: {updatedAt}</p>

                <nav aria-label="Contents" className="mt-8 rounded-xl border border-border bg-muted/30 p-5">
                    <p className="mb-2 text-sm font-semibold">Contents</p>
                    <ol className="list-decimal space-y-1 pl-5 text-sm">
                        {sections.map((s, i) => (
                            <li key={s.title}>
                                <a href={`#section-${i + 1}`} className="text-primary hover:underline">
                                    {s.title}
                                </a>
                            </li>
                        ))}
                    </ol>
                </nav>

                <div className="mt-10 space-y-8">
                    {sections.map((s, i) => (
                        <section key={s.title} id={`section-${i + 1}`} className="scroll-mt-24">
                            <h2 className="text-xl font-semibold">
                                {i + 1}. {s.title}
                            </h2>
                            {s.body.map((p) => (
                                <p key={p} className="mt-3 text-muted-foreground">
                                    {p}
                                </p>
                            ))}
                        </section>
                    ))}

                    <section>
                        <h2 className="text-xl font-semibold">{sections.length + 1}. Contact</h2>
                        <p className="mt-3 text-muted-foreground">
                            Questions about these terms? <Link href={contact().url} className="text-primary hover:underline">Contact us</Link>.
                        </p>
                    </section>
                </div>
            </article>
        </PublicLayout>
    );
}

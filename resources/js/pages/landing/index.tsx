import { Link } from '@inertiajs/react';
import { ArrowRight, CheckCircle, Building2, Globe, Shield, Zap } from 'lucide-react';

const features = [
    { icon: <Building2 size={20} />, title: 'CRM & Lead Management', desc: 'Track leads, manage pipelines, and close deals faster.' },
    { icon: <Globe size={20} />, title: 'Mobile Money Payments', desc: 'M-Pesa, Airtel Money, and MTN MoMo integrated natively.' },
    { icon: <Shield size={20} />, title: 'Kenya Payroll', desc: 'PAYE, NSSF, SHIF, Housing Levy, and HELB — fully automated.' },
    { icon: <Zap size={20} />, title: 'AI Document Intelligence', desc: 'Extract, summarise, and act on documents with Claude AI.' },
];

export default function Landing() {
    return (
        <div className="min-h-screen bg-stone-950 text-stone-100 font-sans">
            {/* Nav */}
            <nav className="flex items-center justify-between px-6 py-5 max-w-7xl mx-auto">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
                        <Building2 size={16} className="text-stone-950" />
                    </div>
                    <span className="font-semibold text-lg">Nexus</span>
                </div>
                <div className="flex items-center gap-4">
                    <Link href="/login" className="text-sm text-stone-400 hover:text-stone-100 transition-colors">
                        Sign in
                    </Link>
                    <Link
                        href="/register"
                        className="text-sm bg-amber-500 text-stone-950 font-semibold px-4 py-2 rounded-lg
                            hover:bg-amber-400 transition-colors"
                    >
                        Start free trial
                    </Link>
                </div>
            </nav>

            {/* Hero */}
            <section className="max-w-7xl mx-auto px-6 pt-24 pb-20 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10
                    border border-amber-500/20 text-amber-400 text-xs font-medium mb-8">
                    Built for East African SMEs
                </div>
                <h1 className="text-5xl md:text-6xl font-bold text-stone-50 leading-tight tracking-tight mb-6">
                    Run your entire business<br />
                    <span className="text-amber-400">from one platform</span>
                </h1>
                <p className="text-xl text-stone-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                    CRM, projects, payroll, expenses, and mobile money payments — all in one
                    platform built for Kenyan and East African businesses.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link
                        href="/register"
                        className="flex items-center gap-2 bg-amber-500 text-stone-950 font-semibold
                            px-6 py-3.5 rounded-xl hover:bg-amber-400 transition-colors text-sm"
                    >
                        Start your 14-day free trial
                        <ArrowRight size={16} />
                    </Link>
                    <span className="text-stone-500 text-sm">No credit card required</span>
                </div>
            </section>

            {/* Features */}
            <section className="max-w-7xl mx-auto px-6 py-20">
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {features.map((f) => (
                        <div
                            key={f.title}
                            className="bg-stone-900 border border-stone-800 rounded-2xl p-6 hover:border-stone-700
                                transition-colors"
                        >
                            <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center
                                text-amber-400 mb-4">
                                {f.icon}
                            </div>
                            <h3 className="font-semibold text-stone-100 mb-2">{f.title}</h3>
                            <p className="text-sm text-stone-400 leading-relaxed">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Plans */}
            <section className="max-w-7xl mx-auto px-6 py-20 border-t border-stone-800">
                <h2 className="text-3xl font-bold text-center mb-12">Simple pricing</h2>
                <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                    {[
                        { name: 'Starter', price: 'KES 3,500', period: '/mo', users: '1–5 users', highlight: false },
                        { name: 'Growth', price: 'KES 8,500', period: '/mo', users: 'Up to 25 users', highlight: true },
                        { name: 'Enterprise', price: 'Custom', period: '', users: 'Unlimited users', highlight: false },
                    ].map((plan) => (
                        <div
                            key={plan.name}
                            className={`rounded-2xl p-6 border ${
                                plan.highlight
                                    ? 'bg-amber-500 border-amber-400 text-stone-950'
                                    : 'bg-stone-900 border-stone-800 text-stone-100'
                            }`}
                        >
                            <div className="font-semibold text-lg mb-1">{plan.name}</div>
                            <div className="flex items-baseline gap-1 mb-1">
                                <span className="text-3xl font-bold">{plan.price}</span>
                                <span className={`text-sm ${plan.highlight ? 'text-stone-800' : 'text-stone-400'}`}>
                                    {plan.period}
                                </span>
                            </div>
                            <div className={`text-sm mb-6 ${plan.highlight ? 'text-stone-800' : 'text-stone-400'}`}>
                                {plan.users}
                            </div>
                            <Link
                                href="/register"
                                className={`block text-center text-sm font-semibold py-2.5 rounded-lg transition-colors
                                    ${plan.highlight
                                        ? 'bg-stone-950 text-amber-400 hover:bg-stone-900'
                                        : 'bg-stone-800 text-stone-100 hover:bg-stone-700'
                                    }`}
                            >
                                Get started
                            </Link>
                        </div>
                    ))}
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-stone-800 py-8 px-6 text-center text-stone-500 text-sm">
                &copy; {new Date().getFullYear()} Nexus Business Platform. Built for East Africa.
            </footer>
        </div>
    );
}

import { Head, usePage } from '@inertiajs/react';
import AppLayout from '@/components/AppLayout';
import { type PageProps } from '@/types';
import {
    Users, FolderKanban, Receipt, TrendingUp,
    ArrowUpRight, Clock, CheckCircle2,
} from 'lucide-react';

interface DashboardProps extends PageProps {
    tenant: { name: string; plan: string | null };
}

const statCards = [
    { label: 'Active Leads', value: '—', icon: <Users size={18} />, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { label: 'Open Projects', value: '—', icon: <FolderKanban size={18} />, color: 'text-purple-400', bg: 'bg-purple-400/10' },
    { label: 'Expenses MTD', value: '—', icon: <Receipt size={18} />, color: 'text-rose-400', bg: 'bg-rose-400/10' },
    { label: 'Revenue MTD', value: '—', icon: <TrendingUp size={18} />, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
];

export default function Dashboard() {
    const { auth } = usePage<DashboardProps>().props;
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

    return (
        <AppLayout>
            <Head title="Dashboard" />
            <div className="p-6 max-w-7xl">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-semibold text-stone-100">
                        {greeting}, {auth.user?.name.split(' ')[0]}
                    </h1>
                    <p className="text-stone-400 mt-1 text-sm">
                        {new Date().toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {statCards.map((stat) => (
                        <div
                            key={stat.label}
                            className="bg-stone-900 border border-stone-800 rounded-2xl p-5"
                        >
                            <div className={`w-9 h-9 ${stat.bg} rounded-xl flex items-center justify-center ${stat.color} mb-4`}>
                                {stat.icon}
                            </div>
                            <div className="text-2xl font-bold text-stone-100 mb-1">{stat.value}</div>
                            <div className="text-xs text-stone-500">{stat.label}</div>
                        </div>
                    ))}
                </div>

                {/* Content grid */}
                <div className="grid lg:grid-cols-2 gap-6">
                    {/* Recent Activity */}
                    <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="font-semibold text-stone-100">Recent Activity</h2>
                            <button className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors">
                                View all <ArrowUpRight size={12} />
                            </button>
                        </div>
                        <div className="flex flex-col items-center justify-center py-10 text-center">
                            <Clock size={32} className="text-stone-700 mb-3" />
                            <p className="text-sm text-stone-500">No activity yet</p>
                            <p className="text-xs text-stone-600 mt-1">Activity will appear here as your team works</p>
                        </div>
                    </div>

                    {/* Tasks */}
                    <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="font-semibold text-stone-100">My Tasks</h2>
                            <button className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors">
                                View all <ArrowUpRight size={12} />
                            </button>
                        </div>
                        <div className="flex flex-col items-center justify-center py-10 text-center">
                            <CheckCircle2 size={32} className="text-stone-700 mb-3" />
                            <p className="text-sm text-stone-500">No tasks assigned</p>
                            <p className="text-xs text-stone-600 mt-1">Tasks from your projects will appear here</p>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

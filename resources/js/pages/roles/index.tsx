import { Head } from '@inertiajs/react';
import AppLayout from '@/components/AppLayout';
import { ShieldCheck } from 'lucide-react';

interface Role {
    name: string;
    permission_count: number;
    permissions: string[];
}

const roleDescriptions: Record<string, string> = {
    admin:   'Full platform access — manage team, settings, and all modules.',
    sales:   'CRM and pipeline — manage leads, deals, and client projects.',
    finance: 'Financial operations — expenses, payroll, and invoicing.',
    ops:     'Operational delivery — projects, tasks, and documents.',
};

const roleColour: Record<string, string> = {
    admin:   'bg-amber-500/15 text-amber-400 border-amber-500/20',
    sales:   'bg-blue-500/15 text-blue-400 border-blue-500/20',
    finance: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    ops:     'bg-purple-500/15 text-purple-400 border-purple-500/20',
};

export default function RolesIndex({ roles }: { roles: Role[] }) {
    return (
        <AppLayout>
            <Head title="Roles" />
            <div className="p-6 max-w-4xl">
                <div className="mb-6">
                    <h1 className="text-xl font-semibold text-stone-100">Roles</h1>
                    <p className="text-sm text-stone-400 mt-1">
                        Roles define what each team member can see and do. Role permissions are managed by Nexus.
                    </p>
                </div>

                <div className="grid gap-4">
                    {roles.map((role) => {
                        const colour = roleColour[role.name] ?? 'bg-stone-700/30 text-stone-300 border-stone-700';
                        return (
                            <div key={role.name} className="bg-stone-900 border border-stone-800 rounded-2xl p-5">
                                <div className="flex items-start gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colour}`}>
                                        <ShieldCheck size={18} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-1">
                                            <h2 className="font-semibold text-stone-100 capitalize">{role.name}</h2>
                                            <span className={`text-xs px-2 py-0.5 rounded-md border ${colour}`}>
                                                {role.permission_count} permissions
                                            </span>
                                        </div>
                                        <p className="text-sm text-stone-400 mb-3">
                                            {roleDescriptions[role.name] ?? `${role.name} role`}
                                        </p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {role.permissions.map((perm) => (
                                                <span key={perm} className="text-xs bg-stone-800 text-stone-400
                                                    border border-stone-700 px-2 py-0.5 rounded-md font-mono">
                                                    {perm}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </AppLayout>
    );
}

import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { type BreadcrumbItem } from '@/types';
import { Users, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Payroll', href: '/payroll' },
    { title: 'Employees', href: '/payroll/employees' },
];

interface Employee {
    id: number;
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
    department?: string;
    job_title?: string;
    active: boolean;
    basic_salary?: number;
}

interface Props {
    employees: {
        data: Employee[];
        links: { url: string | null; label: string; active: boolean }[];
        current_page: number;
        last_page: number;
        total: number;
    };
    departments: string[];
}

const fmt = (n?: number) =>
    n == null
        ? '—'
        : new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(n);

export default function PayrollEmployees({ employees, departments }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Employees" />
            <div className="space-y-5 p-6">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h1 className="text-lg font-bold flex items-center gap-2">
                            <Users className="h-5 w-5 text-emerald-500" />
                            Employees
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">{employees.total} records</p>
                    </div>
                    <Button asChild>
                        <Link href="/payroll/employees/create">
                            <Plus className="h-4 w-4 mr-1" /> Add employee
                        </Link>
                    </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                    <select
                        className="rounded-md border bg-background px-3 py-2 text-sm"
                        defaultValue=""
                        onChange={(e) =>
                            router.get(
                                '/payroll/employees',
                                { department: e.target.value || undefined, active_only: true },
                                { preserveState: true },
                            )
                        }
                    >
                        <option value="">All departments</option>
                        {(departments ?? []).map((d) => (
                            <option key={d} value={d}>
                                {d}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="rounded-xl border bg-card overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b text-left text-muted-foreground">
                                <th className="px-4 py-2 font-medium">Name</th>
                                <th className="px-4 py-2 font-medium">Department</th>
                                <th className="px-4 py-2 font-medium">Title</th>
                                <th className="px-4 py-2 font-medium text-right">Basic</th>
                                <th className="px-4 py-2 font-medium">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {employees.data.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                                        No employees found.
                                    </td>
                                </tr>
                            )}
                            {employees.data.map((e) => (
                                <tr key={e.id} className="border-b last:border-0 hover:bg-muted/40">
                                    <td className="px-4 py-2">
                                        <Link
                                            href={`/payroll/employees/${e.id}/edit`}
                                            className="font-medium text-primary hover:underline"
                                        >
                                            {e.first_name} {e.last_name}
                                        </Link>
                                        {e.email && (
                                            <div className="text-xs text-muted-foreground">{e.email}</div>
                                        )}
                                    </td>
                                    <td className="px-4 py-2">{e.department || '—'}</td>
                                    <td className="px-4 py-2">{e.job_title || '—'}</td>
                                    <td className="px-4 py-2 text-right tabular-nums">{fmt(e.basic_salary)}</td>
                                    <td className="px-4 py-2">
                                        <span
                                            className={cn(
                                                'inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1',
                                                e.active
                                                    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                                                    : 'bg-zinc-50 text-zinc-600 ring-zinc-200',
                                            )}
                                        >
                                            {e.active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </AppLayout>
    );
}

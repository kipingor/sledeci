import AppLayout from '@/layouts/app-layout';
import { Head, Link, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { type BreadcrumbItem } from '@/types';

interface Employee {
    id?: number;
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    id_number?: string;
    kra_pin?: string;
    nssf_number?: string;
    nhif_number?: string;
    department?: string;
    job_title?: string;
    basic_salary?: number | string;
    active?: boolean;
}

interface Props {
    employee: Employee | null;
}

export default function EmployeeForm({ employee }: Props) {
    const isEdit = !!employee?.id;
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Payroll', href: '/payroll' },
        { title: 'Employees', href: '/payroll/employees' },
        { title: isEdit ? 'Edit' : 'Create', href: '#' },
    ];

    const { data, setData, post, put, processing, errors } = useForm({
        first_name: employee?.first_name ?? '',
        last_name: employee?.last_name ?? '',
        email: employee?.email ?? '',
        phone: employee?.phone ?? '',
        id_number: employee?.id_number ?? '',
        kra_pin: employee?.kra_pin ?? '',
        nssf_number: employee?.nssf_number ?? '',
        nhif_number: employee?.nhif_number ?? '',
        department: employee?.department ?? '',
        job_title: employee?.job_title ?? '',
        basic_salary: employee?.basic_salary ?? '',
        active: employee?.active ?? true,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEdit) {
            put(`/payroll/employees/${employee!.id}`);
        } else {
            post('/payroll/employees');
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={isEdit ? 'Edit employee' : 'Add employee'} />
            <div className="max-w-2xl space-y-6 p-6">
                <h1 className="text-lg font-bold">{isEdit ? 'Edit employee' : 'Add employee'}</h1>
                <form onSubmit={submit} className="space-y-4 rounded-xl border bg-card p-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                        {(
                            [
                                ['first_name', 'First name'],
                                ['last_name', 'Last name'],
                                ['email', 'Email'],
                                ['phone', 'Phone'],
                                ['id_number', 'ID number'],
                                ['kra_pin', 'KRA PIN'],
                                ['nssf_number', 'NSSF'],
                                ['nhif_number', 'NHIF'],
                                ['department', 'Department'],
                                ['job_title', 'Job title'],
                                ['basic_salary', 'Basic salary'],
                            ] as const
                        ).map(([key, label]) => (
                            <div key={key}>
                                <label className="text-sm font-medium">{label}</label>
                                <Input
                                    className="mt-1"
                                    type={key === 'basic_salary' ? 'number' : key === 'email' ? 'email' : 'text'}
                                    value={String(data[key] ?? '')}
                                    onChange={(e) => setData(key, e.target.value)}
                                />
                                {errors[key] && <p className="text-xs text-red-600 mt-1">{errors[key]}</p>}
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2 pt-2">
                        <Button type="submit" disabled={processing}>
                            {isEdit ? 'Save' : 'Create'}
                        </Button>
                        <Button type="button" variant="outline" asChild>
                            <Link href="/payroll/employees">Cancel</Link>
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}

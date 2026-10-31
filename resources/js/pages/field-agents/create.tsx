import AppLayout from '@/layouts/app-layout';
import { Head, Link, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { type BreadcrumbItem } from '@/types';
import { Users } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Field Agents', href: '/field-agents' },
    { title: 'Create', href: '/field-agents/create' },
];

interface UserOption { id: number; name: string; email: string }

interface Props {
    users: UserOption[];
}

export default function FieldAgentCreate({ users }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        user_id: '',
        agent_code: '',
        territory: '',
        phone: '',
        commission_rate: '',
    });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Create Field Agent" />
            <div className="max-w-lg space-y-6 p-6">
                <h1 className="text-lg font-bold flex items-center gap-2">
                    <Users className="h-5 w-5 text-amber-500" />
                    New field agent
                </h1>

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        post('/field-agents');
                    }}
                    className="space-y-4 rounded-xl border bg-card p-5"
                >
                    <div>
                        <label className="text-sm font-medium">User</label>
                        <select
                            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                            value={data.user_id}
                            onChange={(e) => setData('user_id', e.target.value)}
                            required
                        >
                            <option value="">Select user…</option>
                            {users.map((u) => (
                                <option key={u.id} value={u.id}>
                                    {u.name} ({u.email})
                                </option>
                            ))}
                        </select>
                        {errors.user_id && <p className="text-xs text-red-600 mt-1">{errors.user_id}</p>}
                    </div>
                    <div>
                        <label className="text-sm font-medium">Agent code</label>
                        <Input value={data.agent_code} onChange={(e) => setData('agent_code', e.target.value)} placeholder="FA-001" />
                        {errors.agent_code && <p className="text-xs text-red-600 mt-1">{errors.agent_code}</p>}
                    </div>
                    <div>
                        <label className="text-sm font-medium">Territory</label>
                        <Input value={data.territory} onChange={(e) => setData('territory', e.target.value)} />
                    </div>
                    <div>
                        <label className="text-sm font-medium">Phone</label>
                        <Input value={data.phone} onChange={(e) => setData('phone', e.target.value)} />
                    </div>
                    <div>
                        <label className="text-sm font-medium">Commission rate %</label>
                        <Input type="number" step="0.01" value={data.commission_rate} onChange={(e) => setData('commission_rate', e.target.value)} />
                    </div>
                    <div className="flex gap-2 pt-2">
                        <Button type="submit" disabled={processing}>Create</Button>
                        <Button type="button" variant="outline" asChild>
                            <Link href="/field-agents">Cancel</Link>
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}

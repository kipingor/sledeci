import { useForm, Head, Link } from '@inertiajs/react';
import AppLayout from '@/components/AppLayout';
import { Loader2, ArrowLeft } from 'lucide-react';

interface UserData {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    is_active: boolean;
    role: string | null;
}

interface Props {
    user: UserData;
    roles: string[];
}

export default function EditUser({ user, roles }: Props) {
    const { data, setData, put, processing, errors } = useForm({
        name:      user.name,
        phone:     user.phone ?? '',
        is_active: user.is_active,
        role:      user.role ?? '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        put(`/users/${user.id}`);
    };

    return (
        <AppLayout>
            <Head title={`Edit ${user.name}`} />
            <div className="p-6 max-w-2xl">
                <div className="mb-6">
                    <Link href="/users" className="inline-flex items-center gap-1.5 text-sm text-stone-400
                        hover:text-stone-100 transition-colors mb-4">
                        <ArrowLeft size={15} /> Back to team
                    </Link>
                    <h1 className="text-xl font-semibold text-stone-100">Edit {user.name}</h1>
                    <p className="text-sm text-stone-400 mt-1">{user.email}</p>
                </div>

                <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6">
                    <form onSubmit={submit} className="space-y-5">
                        <div className="grid sm:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-sm text-stone-300 mb-1.5">Full name <span className="text-red-400">*</span></label>
                                <input
                                    type="text"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    className="w-full bg-stone-800 border border-stone-700 rounded-xl px-4 py-2.5
                                        text-sm text-stone-100 placeholder-stone-500 focus:outline-none
                                        focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                                    required
                                />
                                {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name}</p>}
                            </div>

                            <div>
                                <label className="block text-sm text-stone-300 mb-1.5">Phone</label>
                                <input
                                    type="tel"
                                    value={data.phone}
                                    onChange={(e) => setData('phone', e.target.value)}
                                    className="w-full bg-stone-800 border border-stone-700 rounded-xl px-4 py-2.5
                                        text-sm text-stone-100 placeholder-stone-500 focus:outline-none
                                        focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                                    placeholder="+254 7XX XXX XXX"
                                />
                                {errors.phone && <p className="mt-1 text-xs text-red-400">{errors.phone}</p>}
                            </div>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-sm text-stone-300 mb-1.5">Role</label>
                                <select
                                    value={data.role}
                                    onChange={(e) => setData('role', e.target.value)}
                                    className="w-full bg-stone-800 border border-stone-700 rounded-xl px-4 py-2.5
                                        text-sm text-stone-100 focus:outline-none focus:border-amber-500
                                        focus:ring-1 focus:ring-amber-500 transition-colors"
                                >
                                    <option value="" disabled>Select a role…</option>
                                    {roles.map((role) => (
                                        <option key={role} value={role} className="capitalize">{role}</option>
                                    ))}
                                </select>
                                {errors.role && <p className="mt-1 text-xs text-red-400">{errors.role}</p>}
                            </div>

                            <div>
                                <label className="block text-sm text-stone-300 mb-1.5">Status</label>
                                <label className="flex items-center gap-3 cursor-pointer mt-3">
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            checked={data.is_active}
                                            onChange={(e) => setData('is_active', e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-10 h-6 bg-stone-700 rounded-full peer-checked:bg-amber-500
                                            transition-colors after:absolute after:top-0.5 after:left-0.5 after:bg-white
                                            after:rounded-full after:h-5 after:w-5 after:transition-transform
                                            peer-checked:after:translate-x-4" />
                                    </div>
                                    <span className="text-sm text-stone-300">
                                        {data.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </label>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                            <button
                                type="submit"
                                disabled={processing}
                                className="flex items-center gap-2 bg-amber-500 text-stone-950 font-semibold
                                    px-5 py-2.5 rounded-xl hover:bg-amber-400 disabled:opacity-50
                                    transition-colors text-sm"
                            >
                                {processing && <Loader2 size={15} className="animate-spin" />}
                                Save changes
                            </button>
                            <Link href="/users" className="text-sm text-stone-400 hover:text-stone-200 transition-colors">
                                Cancel
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </AppLayout>
    );
}

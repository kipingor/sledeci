import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link, router } from '@inertiajs/react';
import {
    Receipt, DollarSign, Calendar, Tag, Building2, User,
    Trash2, ExternalLink,
} from 'lucide-react';

export interface Expense {
    id: number;
    project_id?: number | null;
    amount: string | number;
    currency: string;
    category?: string | null;
    description: string;
    incurred_at?: string | null;
    vendor?: string | null;
    receipt_path?: string | null;
    notes?: string | null;
    project?: { id: number; name: string } | null;
    user?: { id: number; name: string } | null;
}

const categoryColour: Record<string, string> = {
    travel: 'bg-blue-100 text-blue-700',
    accommodation: 'bg-purple-100 text-purple-700',
    software: 'bg-cyan-100 text-cyan-700',
    hardware: 'bg-orange-100 text-orange-700',
    meals: 'bg-green-100 text-green-700',
    supplies: 'bg-yellow-100 text-yellow-700',
    marketing: 'bg-pink-100 text-pink-700',
    utilities: 'bg-gray-100 text-gray-700',
    other: 'bg-gray-100 text-gray-700',
};

const fmt = (amount: string | number, currency = 'USD') =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(amount));

export default function ExpenseCard({ expense, onDelete }: { expense: Expense; onDelete?: (id: number) => void }) {
    const catColour = expense.category ? (categoryColour[expense.category.toLowerCase()] ?? categoryColour.other) : categoryColour.other;

    const handleDelete = () => {
        if (!confirm('Delete this expense?')) return;
        if (onDelete) {
            onDelete(expense.id);
        } else {
            router.delete(`/expenses/${expense.id}`, { preserveScroll: true });
        }
    };

    return (
        <Card className="hover:shadow-md transition-shadow group">
            <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-4">
                    {/* Left */}
                    <div className="flex items-start gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
                            <Receipt className="h-5 w-5 text-orange-600" />
                        </div>
                        <div className="min-w-0">
                            <p className="font-semibold text-gray-900 truncate">{expense.description}</p>
                            <p className="text-2xl font-bold mt-0.5">
                                {fmt(expense.amount, expense.currency)}
                            </p>
                        </div>
                    </div>

                    {/* Right — category badge + delete */}
                    <div className="flex items-start gap-2 shrink-0">
                        {expense.category && (
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${catColour}`}>
                                <Tag className="w-3 h-3" />
                                {expense.category}
                            </span>
                        )}
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={handleDelete}
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>

                {/* Meta */}
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
                    {expense.incurred_at && (
                        <span className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            {new Date(expense.incurred_at).toLocaleDateString('en-US', {
                                day: 'numeric', month: 'short', year: 'numeric',
                            })}
                        </span>
                    )}
                    {expense.vendor && (
                        <span className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5" />
                            {expense.vendor}
                        </span>
                    )}
                    {expense.project && (
                        <Link
                            href={`/projects/${expense.project.id}`}
                            className="flex items-center gap-1.5 text-primary hover:underline"
                        >
                            <ExternalLink className="h-3.5 w-3.5" />
                            {expense.project.name}
                        </Link>
                    )}
                    {expense.user && (
                        <span className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5" />
                            {expense.user.name}
                        </span>
                    )}
                </div>

                {/* Notes */}
                {expense.notes && (
                    <p className="mt-2 text-sm text-muted-foreground italic border-l-2 border-muted pl-2">
                        {expense.notes}
                    </p>
                )}

                {/* Receipt link */}
                {expense.receipt_path && (
                    <a
                        href={expense.receipt_path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                    >
                        <Receipt className="h-3 w-3" />View receipt
                    </a>
                )}
            </CardContent>
        </Card>
    );
}
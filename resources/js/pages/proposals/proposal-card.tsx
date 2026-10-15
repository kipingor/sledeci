import { Link } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Calendar, DollarSign } from 'lucide-react';

interface Proposal {
    id: number;
    title: string;
    status: string;
    created_at: string;
    total_amount?: number;
    currency?: string;
}

interface ProposalCardProps {
    proposal: Proposal;
}

export default function ProposalCard({ proposal }: ProposalCardProps) {
    const formatCurrency = (amount: number, currency = 'KES') => {
        return new Intl.NumberFormat('en-KE', {
            style: 'currency',
            currency,
        }).format(amount);
    };

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'draft':
                return 'bg-gray-100 text-gray-800';
            case 'sent':
                return 'bg-blue-100 text-blue-800';
            case 'accepted':
                return 'bg-green-100 text-green-800';
            case 'rejected':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <Link href={`/proposals/${proposal.id}`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                        <CardTitle className="text-sm font-medium line-clamp-2">
                            {proposal.title}
                        </CardTitle>
                        <Badge className={`text-xs ${getStatusColor(proposal.status)}`}>
                            {proposal.status}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="space-y-2">
                        {proposal.total_amount && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <DollarSign className="h-4 w-4" />
                                <span>{formatCurrency(proposal.total_amount, proposal.currency)}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>{new Date(proposal.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}
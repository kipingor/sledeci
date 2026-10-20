import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type BadgeVariant = React.ComponentProps<typeof Badge>['variant'];

interface LeadStatusBadgeProps {
    lead: {
        id: string | number;
        status_color: BadgeVariant;
        status_label: string;
        availableTransitions?: Array<{
            value: string;
            color: BadgeVariant;
            label: string;
        }>;
    };
    onTransition: (leadId: string | number, status: string) => void;
}

export function LeadStatusBadge({ lead, onTransition }: LeadStatusBadgeProps) {
    const [open, setOpen] = useState(false);
    const availableTransitions = lead.availableTransitions || [];
    
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Badge 
                    variant={lead.status_color}
                    className="cursor-pointer hover:opacity-80"
                >
                    {lead.status_label}
                </Badge>
            </PopoverTrigger>
            <PopoverContent className="w-56">
                <div className="space-y-2">
                    <h4 className="font-medium text-sm">Change Status</h4>
                    <div className="space-y-1">
                        {availableTransitions.map((status) => (
                            <Button
                                key={status.value}
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start"
                                onClick={() => {
                                    onTransition(lead.id, status.value);
                                    setOpen(false);
                                }}
                            >
                                <Badge variant={status.color} className="mr-2">
                                    {status.label}
                                </Badge>
                            </Button>
                        ))}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
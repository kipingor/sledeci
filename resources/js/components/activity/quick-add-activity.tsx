import React, { useState } from 'react';
import { ActivityFormModal } from './activity-form-modal';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Plus, Phone, Mail, Calendar, FileText, CheckSquare } from 'lucide-react';
import { ActivityType, ACTIVITY_TYPE_CONFIGS } from '@/types/activity.types';
import { cn } from '@/lib/utils';

interface QuickAddActivityProps {
    leadId: number;
    onSuccess?: () => void;
    className?: string;
}

const iconMap = {
    phone: Phone,
    mail: Mail,
    calendar: Calendar,
    'file-text': FileText,
    'check-square': CheckSquare,
};

export function QuickAddActivity({ leadId, onSuccess, className }: QuickAddActivityProps) {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedType, setSelectedType] = useState<ActivityType | undefined>();

    const handleQuickAdd = (type: ActivityType) => {
        setSelectedType(type);
        setIsFormOpen(true);
    };

    const handleFormSuccess = () => {
        setSelectedType(undefined);
        onSuccess?.();
    };

    return (
        <>
            <div className={cn('fixed bottom-6 right-6 z-40', className)}>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            size="lg"
                            className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow"
                        >
                            <Plus className="h-6 w-6" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>Quick Add Activity</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {Object.values(ActivityType).map((type) => {
                            const config = ACTIVITY_TYPE_CONFIGS[type];
                            const Icon = iconMap[config.icon as keyof typeof iconMap];
                            return (
                                <DropdownMenuItem
                                    key={type}
                                    onClick={() => handleQuickAdd(type)}
                                    className="cursor-pointer"
                                >
                                    <Icon className="mr-2 h-4 w-4" />
                                    {config.label}
                                </DropdownMenuItem>
                            );
                        })}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <ActivityFormModal
                open={isFormOpen}
                onOpenChange={setIsFormOpen}
                leadId={leadId}
                activity={selectedType ? { type: selectedType } as any : undefined}
                onSuccess={handleFormSuccess}
            />
        </>
    );
}
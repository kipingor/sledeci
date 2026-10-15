import React from 'react';
import { Phone, Mail, Calendar, FileText, CheckSquare, LucideIcon } from 'lucide-react';
import { ACTIVITY_TYPE_CONFIGS } from '@/types/activity.types';
import { cn } from '@/lib/utils';

interface ActivityTypeIconProps {
    type: keyof typeof ACTIVITY_TYPE_CONFIGS;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

const iconMap: Record<string, LucideIcon> = {
    phone: Phone,
    mail: Mail,
    calendar: Calendar,
    'file-text': FileText,
    'check-square': CheckSquare,
};

const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
};

const colorClasses = {
    blue: 'text-blue-600 bg-blue-100',
    purple: 'text-purple-600 bg-purple-100',
    green: 'text-green-600 bg-green-100',
    gray: 'text-gray-600 bg-gray-100',
    orange: 'text-orange-600 bg-orange-100',
};

export function ActivityTypeIcon({ type, size = 'md', className }: ActivityTypeIconProps) {
    const config = ACTIVITY_TYPE_CONFIGS[type];
    const Icon = iconMap[config.icon] || FileText;
    const colorClass = colorClasses[config.color as keyof typeof colorClasses] || colorClasses.gray;

    return (
        <div
            className={cn(
                'rounded-full p-2 flex items-center justify-center',
                colorClass,
                className
            )}
            title={config.label}
        >
            <Icon className={sizeClasses[size]} />
        </div>
    );
}
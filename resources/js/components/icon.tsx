import { cn } from '@/lib/utils';
import { type LucideProps } from 'lucide-react';
import { type ComponentType } from 'react';

interface IconProps extends Omit<LucideProps, 'ref'> {
    // Accept either a Lucide React component or a string identifier
    iconNode: ComponentType<LucideProps> | string;
}

export function Icon({
    iconNode: IconComponent,
    className,
    ...props
}: IconProps) {
    if (typeof IconComponent === 'string') {
        return <span className={cn('h-4 w-4 inline-flex items-center', className)}>{IconComponent}</span>;
    }

    return <IconComponent className={cn('h-4 w-4', className)} {...props} />;
}

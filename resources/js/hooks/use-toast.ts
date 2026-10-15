import { toast } from 'sonner';
export function useToast() {
    return { toast: (o: { title?: string; description?: string; variant?: string }) => (o.variant === 'destructive' ? toast.error(o.title ?? '', { description: o.description }) : toast(o.title ?? '', { description: o.description })) };
}

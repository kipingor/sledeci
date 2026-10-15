import { router } from '@inertiajs/react';
import { useEffect } from 'react';

export function useKeyboardShortcuts() {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in input
            if (e.target instanceof HTMLInputElement || 
                e.target instanceof HTMLTextAreaElement) {
                return;
            }
            
            if (e.key === 'n' && !e.metaKey && !e.ctrlKey) {
                router.visit('/leads/create');
            }
            
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                // Open command palette
            }
        };
        
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);
}

// Usage in leads/index.tsx
export default function LeadsIndex({ leads }) {
    useKeyboardShortcuts();
    // ...
}
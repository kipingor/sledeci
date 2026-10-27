import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';
import { Toaster } from '../sonner';

vi.mock('@/hooks/use-appearance', () => ({
    useAppearance: () => ({ appearance: 'light' }),
}));

describe('Toaster', () => {
    it('renders outside the Inertia page context', () => {
        expect(() => render(<Toaster />)).not.toThrow();
    });
});

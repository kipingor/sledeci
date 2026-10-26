import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PageHeader } from '../page-header';

describe('PageHeader', () => {
    it('renders title and description', () => {
        render(<PageHeader title="Leads" description="All your leads" />);
        expect(screen.getByText('Leads')).toBeTruthy();
        expect(screen.getByText('All your leads')).toBeTruthy();
    });

    it('fires an action button callback', () => {
        const onClick = vi.fn();
        render(<PageHeader title="Leads" actions={[{ label: 'Add lead', onClick }]} />);
        fireEvent.click(screen.getByText('Add lead'));
        expect(onClick).toHaveBeenCalledTimes(1);
    });
});

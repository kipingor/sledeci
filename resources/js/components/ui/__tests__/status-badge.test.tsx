import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StatusBadge, LEAD_STATUS_CONFIG } from '../status-badge';

describe('StatusBadge', () => {
    it('renders the configured label for a known status', () => {
        render(<StatusBadge status="new" />);
        expect(screen.getByText(LEAD_STATUS_CONFIG.new.label)).toBeTruthy();
    });

    it('humanises an unknown status instead of crashing', () => {
        render(<StatusBadge status="awaiting_client_reply" />);
        expect(screen.getByText('Awaiting Client Reply')).toBeTruthy();
    });

    it('uses a custom config when supplied', () => {
        const config = { custom: { ...LEAD_STATUS_CONFIG.new, label: 'Special' } };
        render(<StatusBadge status="custom" config={config} />);
        expect(screen.getByText('Special')).toBeTruthy();
    });
});

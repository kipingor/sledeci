import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DataTable, type Column } from '../data-table';

interface Row { id: number; name: string; email: string }

const columns: Column<Row>[] = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
];

describe('DataTable', () => {
    it('renders headers and rows', () => {
        const data: Row[] = [
            { id: 1, name: 'Ada', email: 'ada@example.com' },
            { id: 2, name: 'Linus', email: 'linus@example.com' },
        ];
        render(<DataTable data={data} columns={columns} />);
        expect(screen.getByText('Name')).toBeTruthy();
        expect(screen.getByText('Ada')).toBeTruthy();
        expect(screen.getByText('linus@example.com')).toBeTruthy();
    });

    it('shows the empty state when there is no data', () => {
        render(<DataTable data={[]} columns={columns} emptyState={{ title: 'Nothing here' }} />);
        expect(screen.getByText('Nothing here')).toBeTruthy();
    });
});

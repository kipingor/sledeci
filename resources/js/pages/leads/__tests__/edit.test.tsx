import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

const { putMock } = vi.hoisted(() => ({ putMock: vi.fn() }));

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    Link: (p: any) => p.children ?? null,
    usePage: () => ({ url: '/', props: { auth: { user: { id: 1, name: 'Test User' } } }, component: 'Test' }),
    router: { put: putMock, post: vi.fn(), visit: vi.fn(), get: vi.fn(), delete: vi.fn() },
}));
vi.mock('@/layouts/app-layout', () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock('@/components/forms/lead-form', () => ({
    LeadForm: ({ initialData, onSubmit }: any) => (
        <div>
            <span data-testid="title">{initialData?.title}</span>
            <button onClick={() => onSubmit({ title: 'Updated title' })}>Save</button>
        </div>
    ),
}));

import LeadEdit from '../edit';

const lead = { id: 42, title: 'Existing lead', type: 'conversation' as const, pipeline_stage_id: 1 };

describe('LeadEdit page', () => {
    beforeEach(() => putMock.mockClear());

    it('passes existing data to the form and PUTs changes to /leads/{id}', () => {
        render(<LeadEdit lead={lead} users={[]} pipelineStages={[]} />);

        expect(screen.getByTestId('title').textContent).toBe('Existing lead');

        fireEvent.click(screen.getByRole('button', { name: /save/i }));

        expect(putMock).toHaveBeenCalledTimes(1);
        expect(putMock.mock.calls[0][0]).toBe('/leads/42');
        expect(putMock.mock.calls[0][1]).toMatchObject({ title: 'Updated title' });
    });
});

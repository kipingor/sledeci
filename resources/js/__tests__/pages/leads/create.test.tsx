import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vite-plus/test';

const { postMock } = vi.hoisted(() => ({ postMock: vi.fn() }));

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    Link: (p: any) => p.children ?? null,
    usePage: () => ({ url: '/', props: { auth: { user: { id: 1, name: 'Test User' } } }, component: 'Test' }),
    router: { post: postMock, put: vi.fn(), visit: vi.fn(), get: vi.fn(), delete: vi.fn() },
}));
vi.mock('@/layouts/app-layout', () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock('@/hooks/use-form-autosave', () => ({ useFormAutosave: () => ({ clearDraft: vi.fn() }) }));
// The real LeadForm is covered by its own tests; here we verify the page's submit contract.
vi.mock('@/components/forms/lead-form', () => ({
    LeadForm: ({ onSubmit }: any) => (
        <button onClick={() => onSubmit({ title: 'Brand new', type: 'conversation' })}>Create Lead</button>
    ),
}));

import LeadCreate from '@/pages/leads/create';

describe('LeadCreate page', () => {
    beforeEach(() => postMock.mockClear());

    it('posts the submitted form data to /leads', () => {
        render(<LeadCreate users={[]} pipelineStages={[]} />);

        fireEvent.click(screen.getByRole('button', { name: /create lead/i }));

        expect(postMock).toHaveBeenCalledTimes(1);
        expect(postMock.mock.calls[0][0]).toBe('/leads');
        expect(postMock.mock.calls[0][1]).toMatchObject({ title: 'Brand new' });
    });
});

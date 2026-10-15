import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import LeadDocumentUploader from '../lead-document-uploader';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

class FakeXHR {
    public upload: any = {};
    public status = 200;
    public responseText = JSON.stringify({ ok: true, document: { id: 123, filename: 'sample.txt' } });
    public onload: any = null;
    public onerror: any = null;
    private _headers: Record<string, string> = {};

    open() {}
    setRequestHeader(k: string, v: string) {
        this._headers[k] = v;
    }
    send(_form: any) {
        // simulate progress
        if (this.upload && this.upload.onprogress) {
            this.upload.onprogress({ lengthComputable: true, loaded: 50, total: 100 });
            this.upload.onprogress({ lengthComputable: true, loaded: 100, total: 100 });
        }

        // simulate async response
        setTimeout(() => {
            if (this.onload) this.onload();
        }, 10);
    }
}

describe('LeadDocumentUploader', () => {
    let originalXhr: any;

    beforeEach(() => {
        originalXhr = (global as any).XMLHttpRequest;
        // Use the FakeXHR class directly so 'new XMLHttpRequest()' works as expected.
        (global as any).XMLHttpRequest = FakeXHR as any;
    });

    afterEach(() => {
        (global as any).XMLHttpRequest = originalXhr;
        vi.restoreAllMocks();
    });

    it('shows progress and calls onUploadComplete on success', async () => {
        const onUploadComplete = vi.fn();
        const onUploadStart = vi.fn();

        render(<LeadDocumentUploader onUploadComplete={onUploadComplete} onUploadStart={onUploadStart} leadId={1} />);

        const button = screen.getByRole('button', { name: /upload document/i });
        fireEvent.click(button);

        const fileInput = document.querySelector('input[type=file]') as HTMLInputElement;
        const file = new File(['hello'], 'sample.txt', { type: 'text/plain' });

        fireEvent.change(fileInput, { target: { files: [file] } });

        await waitFor(() => expect(onUploadStart).toHaveBeenCalled());
        await waitFor(() => expect(onUploadComplete).toHaveBeenCalledWith(123, { id: 123, filename: 'sample.txt' }));
    });
});

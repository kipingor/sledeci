import React, { useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, Upload } from 'lucide-react';

export default function LeadDocumentUploader({ onUploadComplete, onUploadStart, leadId }: any) {
    const ref = useRef<HTMLInputElement | null>(null);
    const [progress, setProgress] = useState<number | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function upload(file: File) {
        onUploadStart?.();
        setBusy(true);
        setError(null);
        setProgress(0);

        const form = new FormData();
        form.append('file', file);
        if (leadId) {
            form.append('lead_id', String(leadId));
        }

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/v1/upload');
        xhr.setRequestHeader('Accept', 'application/json');

        xhr.upload.onprogress = function (e) {
            if (e.lengthComputable) {
                const pct = Math.round((e.loaded / e.total) * 100);
                setProgress(pct);
            }
        };

        xhr.onload = function () {
            setBusy(false);
            setProgress(null);
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const json = JSON.parse(xhr.responseText);
                    if (json.ok) {
                        onUploadComplete?.(json.document.id, json.document);
                    } else {
                        setError(json.message || 'Upload failed');
                    }
                } catch (err) {
                    setError('Invalid server response');
                }
            } else {
                setError(`Upload failed (${xhr.status})`);
            }
        };

        xhr.onerror = function () {
            setBusy(false);
            setProgress(null);
            setError('Network error during upload');
        };

        xhr.send(form);
    }

    return (
        <div className="space-y-3">
            <label className="inline-flex items-center">
                <input
                    ref={ref}
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    disabled={busy}
                    onChange={(e) => e.target.files && upload(e.target.files[0])}
                    className="hidden"
                    aria-label="Select document to upload"
                />
                <Button 
                    type="button" 
                    onClick={() => ref.current?.click()} 
                    disabled={busy}
                    variant="default"
                    size="default"
                    className="gap-2"
                >
                    <Upload className="h-4 w-4" />
                    {busy ? 'Uploading...' : 'Upload document'}
                </Button>
            </label>

            {progress !== null && (
                <div className="space-y-1.5">
                    <Progress value={progress} aria-label="Upload progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} />
                    <div className="text-xs text-muted-foreground text-right">{progress}%</div>
                </div>
            )}

            {error && (
                <div role="alert" className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                </div>
            )}
        </div>
    );
}
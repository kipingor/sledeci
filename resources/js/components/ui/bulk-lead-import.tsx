import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
    Upload, 
    FileSpreadsheet, 
    CheckCircle2, 
    AlertCircle, 
    Download,
    Info,
} from 'lucide-react';
import { router } from '@inertiajs/react';
import { route } from 'ziggy-js';
import { useToast } from '@/hooks/use-toast';

interface ImportResult {
    success: boolean;
    imported: number;
    failed: number;
    errors?: Array<{
        row: number;
        field: string;
        message: string;
    }>;
}

interface BulkLeadImportProps {
    onComplete?: (result: ImportResult) => void;
}

export function BulkLeadImport({ onComplete }: BulkLeadImportProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [importProgress, setImportProgress] = useState(0);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            // Validate file type
            const validTypes = [
                'text/csv',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ];

            if (!validTypes.includes(selectedFile.type)) {
                toast({
                    title: 'Invalid File',
                    description: 'Please upload a CSV or Excel file.',
                    variant: 'destructive',
                });
                return;
            }

            // Validate file size (max 10MB)
            if (selectedFile.size > 10 * 1024 * 1024) {
                toast({
                    title: 'File Too Large',
                    description: 'Maximum file size is 10MB.',
                    variant: 'destructive',
                });
                return;
            }

            setFile(selectedFile);
            setImportResult(null);
        }
    }, [toast]);

    const handleImport = useCallback(async () => {
        if (!file) return;

        setIsImporting(true);
        setImportProgress(0);

        const formData = new FormData();
        formData.append('file', file);

        try {
            // Simulate progress (in real app, this would come from backend)
            const progressInterval = setInterval(() => {
                setImportProgress((prev) => Math.min(prev + 10, 90));
            }, 300);

            // Make the actual upload request
            await new Promise<void>((resolve, reject) => {
                router.post(
                    route('leads.import'),
                    formData,
                    {
                        forceFormData: true,
                        preserveState: true,
                        onProgress: (progress) => {
                            setImportProgress(Math.floor(progress.percentage || 0));
                        },
                        onSuccess: (page: any) => {
                            clearInterval(progressInterval);
                            setImportProgress(100);

                            const result = page.props.flash?.importResult || {
                                success: true,
                                imported: 0,
                                failed: 0,
                            };

                            setImportResult(result);
                            
                            toast({
                                title: 'Import Complete',
                                description: `Successfully imported ${result.imported} lead(s).`,
                                variant: 'default',
                            });

                            if (onComplete) {
                                onComplete(result);
                            }

                            resolve();
                        },
                        onError: (errors: any) => {
                            clearInterval(progressInterval);
                            
                            toast({
                                title: 'Import Failed',
                                description: 'Failed to import leads. Please check your file.',
                                variant: 'destructive',
                            });

                            setImportResult({
                                success: false,
                                imported: 0,
                                failed: 1,
                                errors: Object.entries(errors).map(([field, message]) => ({
                                    row: 0,
                                    field,
                                    message: message as string,
                                })),
                            });

                            reject(new Error('Import failed'));
                        },
                        onFinish: () => {
                            clearInterval(progressInterval);
                            setIsImporting(false);
                        },
                    }
                );
            });
        } catch (error) {
            console.error('Import error:', error);
            setIsImporting(false);
        }
    }, [file, toast, onComplete]);

    const handleReset = useCallback(() => {
        setFile(null);
        setImportResult(null);
        setImportProgress(0);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, []);

    const handleClose = useCallback(() => {
        if (!isImporting) {
            setIsOpen(false);
            setTimeout(handleReset, 300); // Reset after animation
        }
    }, [isImporting, handleReset]);

    const downloadTemplate = useCallback(() => {
        // Download CSV template
        const csvContent = [
            'title,description,type,status,owner_email',
            'Example Lead,A potential customer,business,new,user@example.com',
            'Another Lead,Second example,individual,contacted,user@example.com',
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'leads_import_template.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, []);

    return (
        <>
            <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(true)}
            >
                <Upload className="h-4 w-4 mr-2" />
                Import Leads
            </Button>

            <Dialog open={isOpen} onOpenChange={handleClose}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Import Leads</DialogTitle>
                        <DialogDescription>
                            Upload a CSV or Excel file to bulk import leads.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Template Download */}
                        <Alert>
                            <Info className="h-4 w-4" />
                            <AlertTitle>Need a template?</AlertTitle>
                            <AlertDescription className="flex items-center justify-between">
                                <span>Download our CSV template to get started.</span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={downloadTemplate}
                                >
                                    <Download className="h-4 w-4 mr-2" />
                                    Download Template
                                </Button>
                            </AlertDescription>
                        </Alert>

                        {/* File Upload */}
                        {!importResult && (
                            <div
                                className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".csv,.xlsx,.xls"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />

                                <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                                
                                {file ? (
                                    <div className="space-y-2">
                                        <p className="font-medium">{file.name}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {(file.size / 1024).toFixed(2)} KB
                                        </p>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleReset();
                                            }}
                                        >
                                            Choose Different File
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <p className="font-medium">Click to upload or drag and drop</p>
                                        <p className="text-sm text-muted-foreground">
                                            CSV or Excel files (Max 10MB)
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Import Progress */}
                        {isImporting && (
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>Importing leads...</span>
                                    <span>{importProgress}%</span>
                                </div>
                                <Progress value={importProgress} />
                            </div>
                        )}

                        {/* Import Result */}
                        {importResult && (
                            <div className="space-y-4">
                                <Alert variant={importResult.success ? 'default' : 'destructive'}>
                                    {importResult.success ? (
                                        <CheckCircle2 className="h-4 w-4" />
                                    ) : (
                                        <AlertCircle className="h-4 w-4" />
                                    )}
                                    <AlertTitle>
                                        {importResult.success ? 'Import Successful' : 'Import Failed'}
                                    </AlertTitle>
                                    <AlertDescription>
                                        <div className="flex gap-4 mt-2">
                                            <Badge variant="default">
                                                {importResult.imported} Imported
                                            </Badge>
                                            {importResult.failed > 0 && (
                                                <Badge variant="destructive">
                                                    {importResult.failed} Failed
                                                </Badge>
                                            )}
                                        </div>
                                    </AlertDescription>
                                </Alert>

                                {/* Error Details */}
                                {importResult.errors && importResult.errors.length > 0 && (
                                    <div className="max-h-48 overflow-y-auto space-y-2">
                                        <p className="text-sm font-medium">Errors:</p>
                                        {importResult.errors.map((error, index) => (
                                            <div
                                                key={index}
                                                className="text-sm p-2 bg-destructive/10 rounded"
                                            >
                                                <span className="font-medium">Row {error.row}:</span>{' '}
                                                {error.field && `${error.field} - `}
                                                {error.message}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        {importResult ? (
                            <>
                                <Button variant="outline" onClick={handleReset}>
                                    Import Another File
                                </Button>
                                <Button onClick={handleClose}>
                                    Done
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button variant="outline" onClick={handleClose} disabled={isImporting}>
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleImport}
                                    disabled={!file || isImporting}
                                >
                                    {isImporting ? 'Importing...' : 'Import Leads'}
                                </Button>
                            </>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
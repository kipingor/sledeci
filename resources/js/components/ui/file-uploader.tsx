import { useState, useRef, DragEvent, ChangeEvent, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Upload, X, File, FileText, Image, FileCode, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FileWithPreview extends File {
    preview?: string;
    id?: string;
    status?: 'pending' | 'uploading' | 'success' | 'error';
    error?: string;
}

export interface FileUploaderProps {
    accept?: string;
    maxSize?: number; // in MB
    maxFiles?: number;
    multiple?: boolean;
    value?: FileWithPreview[];
    onChange?: (files: FileWithPreview[]) => void;
    onUpload?: (files: FileWithPreview[]) => Promise<void>;
    onFileUpload?: (file: FileWithPreview, index: number) => Promise<void>;
    disabled?: boolean;
    showPreview?: boolean;
    autoUpload?: boolean;
    className?: string;
    dropzoneClassName?: string;
    allowedFileTypes?: string[];
}

const FILE_TYPE_DESCRIPTIONS: Record<string, string> = {
    'image/*': 'Images',
    'application/pdf': 'PDF',
    'text/*': 'Text files',
    '.doc,.docx': 'Word documents',
    '.xls,.xlsx': 'Excel spreadsheets',
};

export function FileUploader({
    accept,
    maxSize = 10, // 10MB default
    maxFiles = 5,
    multiple = true,
    value = [],
    onChange,
    onUpload,
    onFileUpload,
    disabled = false,
    showPreview = true,
    autoUpload = false,
    className,
    dropzoneClassName,
    allowedFileTypes,
}: FileUploaderProps) {
    const [files, setFiles] = useState<FileWithPreview[]>(value);
    const [isDragging, setIsDragging] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
    const [errors, setErrors] = useState<string[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);

    // Update internal state when value prop changes
    useEffect(() => {
        setFiles(value);
    }, [value]);

    // Generate unique file ID
    const generateFileId = (file: File): string => {
        return `${file.name}-${file.size}-${Date.now()}`;
    };

    // Get file type description
    const getAcceptDescription = (): string => {
        if (!accept) return 'Any file type';
        
        const types = accept.split(',').map(type => type.trim());
        const descriptions = types
            .map(type => FILE_TYPE_DESCRIPTIONS[type] || type)
            .filter((v, i, a) => a.indexOf(v) === i); // Remove duplicates
        
        return descriptions.join(', ');
    };

    // File validation
    const validateFile = useCallback((file: File): string | null => {
        // Check file size
        if (file.size > maxSize * 1024 * 1024) {
            return `${file.name} exceeds maximum size of ${maxSize}MB`;
        }

        // Check file size minimum (prevent 0 byte files)
        if (file.size === 0) {
            return `${file.name} is empty`;
        }

        // Check file type
        if (accept) {
            const acceptedTypes = accept.split(',').map(type => type.trim());
            const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
            const mimeType = file.type.toLowerCase();

            const isAccepted = acceptedTypes.some(type => {
                if (type.startsWith('.')) {
                    return fileExtension === type.toLowerCase();
                }
                if (type.endsWith('/*')) {
                    const typePrefix = type.replace('/*', '');
                    return mimeType.startsWith(typePrefix);
                }
                return mimeType === type.toLowerCase();
            });

            if (!isAccepted) {
                return `${file.name} is not an accepted file type. Accepted: ${getAcceptDescription()}`;
            }
        }

        // Check custom allowed file types
        if (allowedFileTypes && allowedFileTypes.length > 0) {
            const fileExtension = file.name.split('.').pop()?.toLowerCase();
            if (!fileExtension || !allowedFileTypes.includes(`.${fileExtension}`)) {
                return `${file.name} type not allowed. Allowed: ${allowedFileTypes.join(', ')}`;
            }
        }

        return null;
    }, [accept, maxSize, allowedFileTypes]);

    // Handle file selection
    const handleFiles = useCallback(async (newFiles: FileList | null) => {
        if (!newFiles || disabled) return;

        const filesArray = Array.from(newFiles);
        const validationErrors: string[] = [];

        // Check max files
        if (files.length + filesArray.length > maxFiles) {
            validationErrors.push(`Maximum ${maxFiles} files allowed. You can upload ${maxFiles - files.length} more.`);
            setErrors(validationErrors);
            return;
        }

        // Validate each file
        const validFiles: FileWithPreview[] = [];
        for (const file of filesArray) {
            const error = validateFile(file);
            if (error) {
                validationErrors.push(error);
            } else {
                // Add preview for images
                const fileWithPreview = file as FileWithPreview;
                fileWithPreview.id = generateFileId(file);
                fileWithPreview.status = 'pending';
                
                if (file.type.startsWith('image/') && showPreview) {
                    try {
                        fileWithPreview.preview = URL.createObjectURL(file);
                    } catch (err) {
                        console.error('Error creating preview:', err);
                    }
                }
                validFiles.push(fileWithPreview);
            }
        }

        setErrors(validationErrors);

        if (validFiles.length > 0) {
            const updatedFiles = [...files, ...validFiles];
            setFiles(updatedFiles);
            onChange?.(updatedFiles);

            // Auto upload if enabled
            if (autoUpload && onFileUpload) {
                validFiles.forEach(async (file, index) => {
                    try {
                        file.status = 'uploading';
                        await onFileUpload(file, files.length + index);
                        file.status = 'success';
                    } catch (error) {
                        file.status = 'error';
                        file.error = error instanceof Error ? error.message : 'Upload failed';
                    }
                });
            }
        }
    }, [files, maxFiles, disabled, validateFile, onChange, autoUpload, onFileUpload, showPreview]);

    // Drag and drop handlers
    const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled) {
            setIsDragging(true);
        }
    }, [disabled]);

    const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        const target = e.target as HTMLElement;
        const relatedTarget = e.relatedTarget as HTMLElement;
        
        // Only set dragging to false if we're leaving the dropzone entirely
        if (!relatedTarget || !target.contains(relatedTarget)) {
            setIsDragging(false);
        }
    }, []);

    const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (!disabled) {
            handleFiles(e.dataTransfer.files);
        }
    }, [disabled, handleFiles]);

    // Input change handler
    const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        handleFiles(e.target.files);
        // Reset input value to allow uploading the same file again
        if (inputRef.current) {
            inputRef.current.value = '';
        }
    }, [handleFiles]);

    // Remove file
    const removeFile = useCallback((index: number) => {
        const updatedFiles = files.filter((_, i) => i !== index);
        setFiles(updatedFiles);
        onChange?.(updatedFiles);

        // Revoke preview URL
        if (files[index].preview) {
            URL.revokeObjectURL(files[index].preview!);
        }

        // Clear related errors
        setErrors(prev => prev.filter(err => !err.includes(files[index].name)));
    }, [files, onChange]);

    // Upload files
    const handleUpload = useCallback(async () => {
        if (!onUpload) return;

        try {
            await onUpload(files);
        } catch (error) {
            console.error('Upload error:', error);
            setErrors(prev => [...prev, 'Upload failed. Please try again.']);
        }
    }, [files, onUpload]);

    // Retry upload for a specific file
    const retryUpload = useCallback(async (index: number) => {
        if (!onFileUpload) return;

        const file = files[index];
        try {
            file.status = 'uploading';
            file.error = undefined;
            await onFileUpload(file, index);
            file.status = 'success';
            setFiles([...files]);
        } catch (error) {
            file.status = 'error';
            file.error = error instanceof Error ? error.message : 'Upload failed';
            setFiles([...files]);
        }
    }, [files, onFileUpload]);

    // Get file icon
    const getFileIcon = useCallback((file: File) => {
        const type = file.type.toLowerCase();
        if (type.startsWith('image/')) return Image;
        if (type.startsWith('text/') || type.includes('text')) return FileText;
        if (type.includes('pdf')) return File;
        if (type.includes('code') || type.includes('javascript') || type.includes('typescript')) return FileCode;
        return File;
    }, []);

    // Get file status indicator
    const getFileStatus = (file: FileWithPreview) => {
        switch (file.status) {
            case 'uploading':
                return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
            case 'success':
                return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'error':
                return <AlertCircle className="h-4 w-4 text-destructive" />;
            default:
                return null;
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            files.forEach(file => {
                if (file.preview) {
                    URL.revokeObjectURL(file.preview);
                }
            });
        };
    }, [files]);

    const hasErrors = errors.length > 0;
    const hasFiles = files.length > 0;
    const canUpload = hasFiles && !disabled && onUpload;

    return (
        <div className={cn('space-y-4', className)}>
            {/* Drop zone */}
            <div
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                    'relative rounded-lg border-2 border-dashed transition-all duration-200',
                    isDragging 
                        ? 'border-primary bg-primary/5 scale-[1.02]' 
                        : 'border-muted-foreground/25 hover:border-muted-foreground/50',
                    disabled && 'opacity-50 cursor-not-allowed',
                    dropzoneClassName
                )}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept={accept}
                    multiple={multiple}
                    onChange={handleInputChange}
                    disabled={disabled}
                    className="hidden"
                    aria-label="File upload input"
                />

                <div className="flex flex-col items-center justify-center p-8 text-center">
                    <div className={cn(
                        "rounded-full p-4 mb-4 transition-colors",
                        isDragging ? "bg-primary/10" : "bg-muted"
                    )}>
                        <Upload className={cn(
                            "h-8 w-8 transition-colors",
                            isDragging ? "text-primary" : "text-muted-foreground"
                        )} />
                    </div>
                    <p className="text-sm font-medium mb-1">
                        {isDragging ? 'Drop files here' : 'Drag & drop files or click to browse'}
                    </p>
                    <p className="text-xs text-muted-foreground mb-4">
                        {getAcceptDescription()} • Max {maxSize}MB • Up to {maxFiles} files
                    </p>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => inputRef.current?.click()}
                        disabled={disabled || files.length >= maxFiles}
                    >
                        Select Files
                    </Button>
                </div>
            </div>

            {/* Errors */}
            {hasErrors && (
                <div className="space-y-2">
                    {errors.map((error, index) => (
                        <div key={index} className="flex items-start gap-2 p-3 text-sm bg-destructive/10 text-destructive rounded-lg">
                            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                            <span className="flex-1">{error}</span>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 -mr-2"
                                onClick={() => setErrors(prev => prev.filter((_, i) => i !== index))}
                            >
                                <X className="h-3 w-3" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}

            {/* File list */}
            {hasFiles && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium">
                            Selected Files ({files.length}/{maxFiles})
                        </h3>
                        {files.length > 1 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    files.forEach(file => {
                                        if (file.preview) {
                                            URL.revokeObjectURL(file.preview);
                                        }
                                    });
                                    setFiles([]);
                                    onChange?.([]);
                                }}
                                disabled={disabled}
                            >
                                Clear All
                            </Button>
                        )}
                    </div>
                    <div className="space-y-2">
                        {files.map((file, index) => {
                            const Icon = getFileIcon(file);
                            const progress = uploadProgress[file.id || file.name];

                            return (
                                <Card key={file.id || index} className="p-3 hover:shadow-md transition-shadow">
                                    <div className="flex items-start gap-3">
                                        {/* Preview or icon */}
                                        {file.preview && showPreview ? (
                                            <img
                                                src={file.preview}
                                                alt={file.name}
                                                className="h-12 w-12 rounded object-cover shrink-0"
                                                onError={(e) => {
                                                    // Fallback to icon if image fails to load
                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                }}
                                            />
                                        ) : (
                                            <div className="rounded bg-muted p-2 shrink-0">
                                                <Icon className="h-6 w-6 text-muted-foreground" />
                                            </div>
                                        )}

                                        {/* File info */}
                                        <div className="flex-1 min-w-0 space-y-1">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className="text-sm font-medium truncate">
                                                    {file.name}
                                                </p>
                                                {getFileStatus(file)}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                                                {file.type && (
                                                    <>
                                                        <span>•</span>
                                                        <span>{file.type.split('/')[1].toUpperCase()}</span>
                                                    </>
                                                )}
                                            </div>

                                            {/* Progress bar */}
                                            {progress !== undefined && (
                                                <Progress value={progress} className="h-1" />
                                            )}

                                            {/* Error message */}
                                            {file.status === 'error' && file.error && (
                                                <p className="text-xs text-destructive">{file.error}</p>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-1 shrink-0">
                                            {file.status === 'error' && onFileUpload && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => retryUpload(index)}
                                                    disabled={disabled}
                                                    title="Retry upload"
                                                >
                                                    <Loader2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => removeFile(index)}
                                                disabled={disabled || file.status === 'uploading'}
                                                title="Remove file"
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>

                    {/* Upload button */}
                    {canUpload && !autoUpload && (
                        <Button
                            onClick={handleUpload}
                            disabled={disabled || files.length === 0}
                            className="w-full"
                        >
                            Upload {files.length} {files.length === 1 ? 'File' : 'Files'}
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}
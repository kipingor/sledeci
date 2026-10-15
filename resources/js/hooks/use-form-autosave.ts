// File: resources/js/hooks/use-form-autosave.ts
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

interface AutosaveOptions {
    /**
     * Interval in milliseconds between autosaves
     * @default 5000 (5 seconds)
     */
    interval?: number;
    
    /**
     * Whether to show toast notifications for save actions
     * @default false
     */
    showToasts?: boolean;
    
    /**
     * Callback fired when draft is restored
     */
    onRestore?: (data: any) => void;
}

/**
 * Hook for auto-saving form data to localStorage
 * 
 * @param formKey - Unique identifier for this form's draft
 * @param getValues - Function to get current form values
 * @param options - Configuration options
 * 
 * @example
 * ```tsx
 * const form = useForm({ ... });
 * const { clearDraft } = useFormAutosave(
 *   'lead_create',
 *   () => form.getValues()
 * );
 * 
 * // Clear draft on successful submit
 * router.post('/leads', data, {
 *   onSuccess: () => clearDraft(),
 * });
 */
export function useFormAutosave(
    formKey: string,
    getValues?: () => any,
    options: AutosaveOptions = {}
) {
    const {
        interval = 5000,
        showToasts = false,
        onRestore,
    } = options;

    const storageKey = `form_draft_${formKey}`;
    const hasRestoredRef = useRef(false);
    const lastSavedRef = useRef<string | null>(null);

    /**
     * Load saved draft on mount
     */
    useEffect(() => {
        if (hasRestoredRef.current) return;

        const saved = localStorage.getItem(storageKey);
        if (saved) {
            try {
                const data = JSON.parse(saved);
                
                // Check if draft is not too old (24 hours)
                const savedAt = data._savedAt;
                if (savedAt) {
                    const age = Date.now() - savedAt;
                    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
                    
                    if (age > maxAge) {
                        // Draft too old, remove it
                        localStorage.removeItem(storageKey);
                        return;
                    }
                }
                
                // Remove metadata before restoring
                delete data._savedAt;
                
                if (onRestore) {
                    onRestore(data);
                }
                
                if (showToasts) {
                    toast.info('Draft restored', {
                        description: 'Your previous work has been restored',
                        action: {
                            label: 'Discard',
                            onClick: () => {
                                localStorage.removeItem(storageKey);
                                window.location.reload();
                            },
                        },
                        duration: 10000,
                    });
                }
                
                hasRestoredRef.current = true;
            } catch (e) {
                console.error('Failed to restore draft:', e);
                localStorage.removeItem(storageKey);
            }
        }
    }, [storageKey, onRestore, showToasts]);

    /**
     * Auto-save at regular intervals
     */
    useEffect(() => {
        if (!getValues) return;

        const intervalId = setInterval(() => {
            try {
                const values = getValues();
                
                // Skip if values are empty or haven't changed
                const stringified = JSON.stringify(values);
                if (stringified === '{}' || stringified === lastSavedRef.current) {
                    return;
                }
                
                // Add metadata
                const dataToSave = {
                    ...values,
                    _savedAt: Date.now(),
                };
                
                localStorage.setItem(storageKey, JSON.stringify(dataToSave));
                lastSavedRef.current = stringified;
                
                if (showToasts) {
                    toast.success('Draft saved', {
                        duration: 2000,
                    });
                }
            } catch (e) {
                console.error('Failed to save draft:', e);
            }
        }, interval);

        return () => clearInterval(intervalId);
    }, [getValues, interval, showToasts, storageKey]);

    /**
     * Clear the saved draft
     */
    const clearDraft = () => {
        localStorage.removeItem(storageKey);
        lastSavedRef.current = null;
        
        if (showToasts) {
            toast.success('Draft cleared');
        }
    };

    /**
     * Manually save current draft
     */
    const saveDraft = () => {
        if (!getValues) return;

        try {
            const values = getValues();
            const dataToSave = {
                ...values,
                _savedAt: Date.now(),
            };
            
            localStorage.setItem(storageKey, JSON.stringify(dataToSave));
            lastSavedRef.current = JSON.stringify(values);
            
            if (showToasts) {
                toast.success('Draft saved');
            }
        } catch (e) {
            console.error('Failed to save draft:', e);
            toast.error('Failed to save draft');
        }
    };

    /**
     * Check if a draft exists
     */
    const hasDraft = () => {
        return localStorage.getItem(storageKey) !== null;
    };

    return {
        clearDraft,
        saveDraft,
        hasDraft,
    };
}

/**
 * Simplified version that works with React Hook Form
 * 
 * @example
 * ```tsx
 * const form = useForm({ ... });
 * const { clearDraft } = useFormAutosave('lead_create', form);
 * ```
 */
export function useFormAutosaveWithForm(
    formKey: string,
    form?: any,
    options?: AutosaveOptions
) {
    const getValues = form?.getValues;
    
    return useFormAutosave(
        formKey,
        getValues,
        {
            ...options,
            onRestore: (data) => {
                if (form && options?.onRestore) {
                    options.onRestore(data);
                } else if (form) {
                    // Auto-populate form fields
                    Object.entries(data).forEach(([key, value]) => {
                        form.setValue(key, value);
                    });
                }
            },
        }
    );
}
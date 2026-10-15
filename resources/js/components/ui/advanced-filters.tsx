import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Filter, Save, Trash2, Star, StarOff } from 'lucide-react';
// Renamed the import to prevent conflicts with local declaration
import { useLocalStorage as useLocalStorageHook } from '@/hooks/use-local-storage';
import { cn } from '@/lib/utils';

export interface FilterValue {
    key: string;
    value: any;
    label: string;
}

export interface SavedView {
    id: string;
    name: string;
    filters: FilterValue[];
    isDefault?: boolean;
    createdAt: Date;
}

interface AdvancedFiltersProps {
    availableFilters: {
        key: string;
        label: string;
        type: 'select' | 'text' | 'date' | 'number';
        options?: { label: string; value: string }[];
    }[];
    activeFilters: FilterValue[];
    onFiltersChange: (filters: FilterValue[]) => void;
    storageKey?: string;
}

export function AdvancedFilters({
    availableFilters,
    activeFilters,
    onFiltersChange,
    storageKey = 'saved-views',
}: AdvancedFiltersProps) {
    const [savedViews, setSavedViews] = useLocalStorage<SavedView[]>(storageKey, []);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
    const [viewName, setViewName] = useState('');
    const [selectedFilterKey, setSelectedFilterKey] = useState<string>('');
    const [filterValue, setFilterValue] = useState<any>('');

    const addFilter = useCallback(() => {
        if (!selectedFilterKey || !filterValue) return;

        const filterConfig = availableFilters.find(f => f.key === selectedFilterKey);
        if (!filterConfig) return;

        const newFilter: FilterValue = {
            key: selectedFilterKey,
            value: filterValue,
            label: filterConfig.label,
        };

        onFiltersChange([...activeFilters, newFilter]);
        setSelectedFilterKey('');
        setFilterValue('');
    }, [selectedFilterKey, filterValue, activeFilters, availableFilters, onFiltersChange]);

    const removeFilter = useCallback((index: number) => {
        const newFilters = activeFilters.filter((_, i) => i !== index);
        onFiltersChange(newFilters);
    }, [activeFilters, onFiltersChange]);

    const clearAllFilters = useCallback(() => {
        onFiltersChange([]);
    }, [onFiltersChange]);

    const saveView = useCallback(() => {
        if (!viewName.trim() || activeFilters.length === 0) return;

        const newView: SavedView = {
            id: Date.now().toString(),
            name: viewName.trim(),
            filters: activeFilters,
            isDefault: savedViews.length === 0,
            createdAt: new Date(),
        };

        setSavedViews([...savedViews, newView]);
        setViewName('');
        setIsSaveDialogOpen(false);
    }, [viewName, activeFilters, savedViews, setSavedViews]);

    const loadView = useCallback((view: SavedView) => {
        onFiltersChange(view.filters);
    }, [onFiltersChange]);

    const deleteView = useCallback((viewId: string) => {
        setSavedViews(savedViews.filter(v => v.id !== viewId));
    }, [savedViews, setSavedViews]);

    const toggleDefault = useCallback((viewId: string) => {
        setSavedViews(
            savedViews.map(v => ({
                ...v,
                isDefault: v.id === viewId,
            }))
        );
    }, [savedViews, setSavedViews]);

    const selectedFilter = availableFilters.find(f => f.key === selectedFilterKey);

    return (
        <div className="space-y-4">
            {/* Active Filters Display */}
            {activeFilters.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-muted-foreground">Active filters:</span>
                    {activeFilters.map((filter, index) => (
                        <Badge
                            key={index}
                            variant="secondary"
                            className="gap-2"
                        >
                            {filter.label}: {filter.value}
                            <button
                                onClick={() => removeFilter(index)}
                                className="hover:text-destructive"
                            >
                                <Trash2 className="h-3 w-3" />
                            </button>
                        </Badge>
                    ))}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearAllFilters}
                        className="h-7"
                    >
                        Clear All
                    </Button>
                </div>
            )}

            {/* Filter Actions */}
            <div className="flex items-center gap-2">
                {/* Add Filter Dialog */}
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                            <Filter className="h-4 w-4 mr-2" />
                            Add Filter
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add Filter</DialogTitle>
                            <DialogDescription>
                                Select a field and enter a value to filter by.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Filter Field</Label>
                                <Select
                                    value={selectedFilterKey}
                                    onValueChange={setSelectedFilterKey}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a field..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableFilters.map((filter) => (
                                            <SelectItem
                                                key={filter.key}
                                                value={filter.key}
                                            >
                                                {filter.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {selectedFilter && (
                                <div className="space-y-2">
                                    <Label>Value</Label>
                                    {selectedFilter.type === 'select' ? (
                                        <Select
                                            value={filterValue}
                                            onValueChange={setFilterValue}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a value..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {selectedFilter.options?.map((option) => (
                                                    <SelectItem
                                                        key={option.value}
                                                        value={option.value}
                                                    >
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <Input
                                            type={selectedFilter.type}
                                            value={filterValue}
                                            onChange={(e) => setFilterValue(e.target.value)}
                                            placeholder={`Enter ${selectedFilter.label.toLowerCase()}...`}
                                        />
                                    )}
                                </div>
                            )}
                        </div>

                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setIsDialogOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={() => {
                                    addFilter();
                                    setIsDialogOpen(false);
                                }}
                                disabled={!selectedFilterKey || !filterValue}
                            >
                                Add Filter
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Save View Dialog */}
                {activeFilters.length > 0 && (
                    <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                                <Save className="h-4 w-4 mr-2" />
                                Save View
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Save Filter View</DialogTitle>
                                <DialogDescription>
                                    Give this filter combination a name to quickly access it later.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="view-name">View Name</Label>
                                    <Input
                                        id="view-name"
                                        value={viewName}
                                        onChange={(e) => setViewName(e.target.value)}
                                        placeholder="e.g., My Hot Leads"
                                    />
                                </div>

                                <div className="rounded-lg border p-3 bg-muted/50">
                                    <div className="text-sm font-medium mb-2">Filters to save:</div>
                                    <div className="flex flex-wrap gap-2">
                                        {activeFilters.map((filter, index) => (
                                            <Badge key={index} variant="secondary">
                                                {filter.label}: {filter.value}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <DialogFooter>
                                <Button
                                    variant="outline"
                                    onClick={() => setIsSaveDialogOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={saveView}
                                    disabled={!viewName.trim()}
                                >
                                    Save View
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}

                {/* Saved Views Dropdown */}
                {savedViews.length > 0 && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                                Saved Views ({savedViews.length})
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64">
                            {savedViews.map((view) => (
                                <DropdownMenuItem
                                    key={view.id}
                                    className="flex items-center justify-between"
                                    onSelect={() => loadView(view)}
                                >
                                    <span className="flex items-center gap-2">
                                        {view.isDefault && (
                                            <Star className="h-3 w-3 fill-current text-yellow-500" />
                                        )}
                                        {view.name}
                                        <Badge variant="outline" className="text-xs">
                                            {view.filters.length}
                                        </Badge>
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleDefault(view.id);
                                            }}
                                            className="hover:text-yellow-500"
                                        >
                                            {view.isDefault ? (
                                                <Star className="h-3 w-3 fill-current" />
                                            ) : (
                                                <StarOff className="h-3 w-3" />
                                            )}
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deleteView(view.id);
                                            }}
                                            className="hover:text-destructive"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </button>
                                    </div>
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
        </div>
    );
}

// Hook for local storage
function useLocalStorage<T>(key: string, initialValue: T) {
    const [storedValue, setStoredValue] = useState<T>(() => {
        if (typeof window === 'undefined') {
            return initialValue;
        }
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error(`Error loading ${key} from localStorage:`, error);
            return initialValue;
        }
    });

    const setValue = useCallback(
        (value: T | ((val: T) => T)) => {
            try {
                const valueToStore = value instanceof Function ? value(storedValue) : value;
                setStoredValue(valueToStore);
                if (typeof window !== 'undefined') {
                    window.localStorage.setItem(key, JSON.stringify(valueToStore));
                }
            } catch (error) {
                console.error(`Error saving ${key} to localStorage:`, error);
            }
        },
        [key, storedValue]
    );

    return [storedValue, setValue] as const;
}
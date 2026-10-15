import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuCheckboxItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Columns3 } from 'lucide-react';
import { useLocalStorage } from '@/hooks/use-local-storage';

export interface ColumnVisibility {
    [key: string]: boolean;
}

interface ColumnVisibilityToggleProps {
    columns: Array<{
        key: string;
        label: string;
        required?: boolean;
    }>;
    visibleColumns: ColumnVisibility;
    onVisibilityChange: (visibility: ColumnVisibility) => void;
    storageKey?: string;
}

export function ColumnVisibilityToggle({
    columns,
    visibleColumns,
    onVisibilityChange,
    storageKey,
}: ColumnVisibilityToggleProps) {
    const toggleColumn = useCallback(
        (columnKey: string) => {
            const newVisibility = {
                ...visibleColumns,
                [columnKey]: !visibleColumns[columnKey],
            };
            onVisibilityChange(newVisibility);
        },
        [visibleColumns, onVisibilityChange]
    );

    const showAll = useCallback(() => {
        const allVisible = columns.reduce((acc, col) => {
            acc[col.key] = true;
            return acc;
        }, {} as ColumnVisibility);
        onVisibilityChange(allVisible);
    }, [columns, onVisibilityChange]);

    const hideAll = useCallback(() => {
        const allHidden = columns.reduce((acc, col) => {
            acc[col.key] = col.required || false;
            return acc;
        }, {} as ColumnVisibility);
        onVisibilityChange(allHidden);
    }, [columns, onVisibilityChange]);

    const visibleCount = Object.values(visibleColumns).filter(Boolean).length;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                    <Columns3 className="h-4 w-4 mr-2" />
                    Columns ({visibleCount}/{columns.length})
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                <div className="flex gap-2 p-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={showAll}
                        className="flex-1 h-8"
                    >
                        Show All
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={hideAll}
                        className="flex-1 h-8"
                    >
                        Hide All
                    </Button>
                </div>

                <DropdownMenuSeparator />

                {columns.map((column) => (
                    <DropdownMenuCheckboxItem
                        key={column.key}
                        checked={visibleColumns[column.key]}
                        onCheckedChange={() => toggleColumn(column.key)}
                        disabled={column.required}
                    >
                        {column.label}
                        {column.required && (
                            <span className="ml-2 text-xs text-muted-foreground">
                                (Required)
                            </span>
                        )}
                    </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

// Hook for managing column visibility with local storage
export function useColumnVisibility(
    columns: Array<{ key: string; label: string }>,
    storageKey: string = 'column-visibility'
) {
    const defaultVisibility = columns.reduce((acc, col) => {
        acc[col.key] = true;
        return acc;
    }, {} as ColumnVisibility);

    const [visibleColumns, setVisibleColumns] = useLocalStorage<ColumnVisibility>(
        storageKey,
        defaultVisibility
    );

    return {
        visibleColumns,
        setVisibleColumns,
    };
}
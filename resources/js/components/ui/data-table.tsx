import { useState, useMemo, useCallback } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    ChevronDown,
    ChevronUp,
    ChevronsUpDown,
    Search,
    ArrowLeft,
    ArrowRight,
    ChevronsLeft,
    ChevronsRight,
    X,
} from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingState } from '@/components/ui/loading-state';
import { cn } from '@/lib/utils';

// Column interface - exported for external use
export interface Column<T> {
    key: string;
    label: string;
    sortable?: boolean;
    searchable?: boolean;
    render?: (item: T, index: number) => React.ReactNode;
    className?: string;
    headerClassName?: string;
}

export interface DataTablePagination {
    currentPage: number;
    totalPages: number;
    perPage: number;
    total: number;
    onPageChange: (page: number) => void;
    onPerPageChange: (perPage: number) => void;
}

export interface DataTableProps<T> {
    data: T[];
    columns: Column<T>[];
    // Search & Filter
    searchable?: boolean;
    searchPlaceholder?: string;
    searchValue?: string;
    onSearchChange?: (value: string) => void;
    // State
    isLoading?: boolean;
    // Empty State
    emptyState?: {
        title: string;
        description?: string;
        action?: {
            label: string;
            href?: string;
            onClick?: () => void;
        };
    };
    // Pagination
    pagination?: DataTablePagination;
    // Row interactions
    onRowClick?: (item: T, index: number) => void;
    rowClassName?: (item: T, index: number) => string;
    // Selection
    selectable?: boolean;
    selectedRows?: Set<number>;
    onSelectionChange?: (selectedRows: Set<number>) => void;
    // Server-side mode
    serverSide?: boolean;
    sortColumn?: string;
    sortDirection?: 'asc' | 'desc';
    onSortChange?: (column: string, direction: 'asc' | 'desc') => void;
    // Styling
    className?: string;
    compact?: boolean;
}

export function DataTable<T extends Record<string, any>>({
    data,
    columns,
    searchable = false,
    searchPlaceholder = 'Search...',
    searchValue,
    onSearchChange,
    isLoading = false,
    emptyState,
    pagination,
    onRowClick,
    rowClassName,
    selectable = false,
    selectedRows: controlledSelectedRows,
    onSelectionChange,
    serverSide = false,
    sortColumn: controlledSortColumn,
    sortDirection: controlledSortDirection,
    onSortChange,
    className,
    compact = false,
}: DataTableProps<T>) {
    // Local state for client-side features
    const [localSearchTerm, setLocalSearchTerm] = useState('');
    const [localSortColumn, setLocalSortColumn] = useState<string | null>(null);
    const [localSortDirection, setLocalSortDirection] = useState<'asc' | 'desc'>('asc');
    const [localSelectedRows, setLocalSelectedRows] = useState<Set<number>>(new Set());

    // Use controlled or local state
    const searchTerm = searchValue !== undefined ? searchValue : localSearchTerm;
    const sortColumn = controlledSortColumn !== undefined ? controlledSortColumn : localSortColumn;
    const sortDirection = controlledSortDirection !== undefined ? controlledSortDirection : localSortDirection;
    const selectedRows = controlledSelectedRows !== undefined ? controlledSelectedRows : localSelectedRows;

    // Filter data based on search (client-side only)
    const filteredData = useMemo(() => {
        if (serverSide || !searchable || !searchTerm) {
            return data;
        }

        return data.filter((item) =>
            columns
                .filter(col => col.searchable !== false)
                .some((column) => {
                    const value = item[column.key];
                    return String(value).toLowerCase().includes(searchTerm.toLowerCase());
                })
        );
    }, [data, searchTerm, columns, searchable, serverSide]);

    // Sort data (client-side only)
    const sortedData = useMemo(() => {
        if (serverSide || !sortColumn) {
            return filteredData;
        }

        return [...filteredData].sort((a, b) => {
            const aValue = a[sortColumn];
            const bValue = b[sortColumn];

            if (aValue === bValue) return 0;

            const comparison = aValue > bValue ? 1 : -1;
            return sortDirection === 'asc' ? comparison : -comparison;
        });
    }, [filteredData, sortColumn, sortDirection, serverSide]);

    // Handle sort
    const handleSort = useCallback((columnKey: string) => {
        if (serverSide && onSortChange) {
            const newDirection = sortColumn === columnKey && sortDirection === 'asc' ? 'desc' : 'asc';
            onSortChange(columnKey, newDirection);
        } else {
            if (localSortColumn === columnKey) {
                setLocalSortDirection(localSortDirection === 'asc' ? 'desc' : 'asc');
            } else {
                setLocalSortColumn(columnKey);
                setLocalSortDirection('asc');
            }
        }
    }, [serverSide, sortColumn, sortDirection, localSortColumn, localSortDirection, onSortChange]);

    // Handle search
    const handleSearchChange = useCallback((value: string) => {
        if (onSearchChange) {
            onSearchChange(value);
        } else {
            setLocalSearchTerm(value);
        }
    }, [onSearchChange]);

    // Handle selection
    const handleSelectAll = useCallback((checked: boolean) => {
        if (checked) {
            const allIndices = new Set(sortedData.map((_, index) => index));
            if (onSelectionChange) {
                onSelectionChange(allIndices);
            } else {
                setLocalSelectedRows(allIndices);
            }
        } else {
            if (onSelectionChange) {
                onSelectionChange(new Set());
            } else {
                setLocalSelectedRows(new Set());
            }
        }
    }, [sortedData, onSelectionChange]);

    const handleSelectRow = useCallback((index: number, checked: boolean) => {
        const newSelection = new Set(selectedRows);
        if (checked) {
            newSelection.add(index);
        } else {
            newSelection.delete(index);
        }

        if (onSelectionChange) {
            onSelectionChange(newSelection);
        } else {
            setLocalSelectedRows(newSelection);
        }
    }, [selectedRows, onSelectionChange]);

    const isAllSelected = sortedData.length > 0 && selectedRows.size === sortedData.length;
    const isSomeSelected = selectedRows.size > 0 && selectedRows.size < sortedData.length;

    // Loading state
    if (isLoading) {
        return <LoadingState variant="table" />;
    }

    // Empty state
    if (!isLoading && sortedData.length === 0 && !searchTerm) {
        if (emptyState) {
            return (
                <EmptyState
                    title={emptyState.title}
                    description={emptyState.description}
                    action={
                        emptyState.action && emptyState.action.href
                            ? { label: emptyState.action.label, href: emptyState.action.href }
                            : undefined
                    }
                />
            );
        }
        <EmptyState
            title="No data available"
            description="There are no items to display"
        />
    }

    return (
        <div className={cn('space-y-4', className)}>
            {/* Search and Actions */}
            {(searchable || selectedRows.size > 0) && (
                <div className="flex items-center gap-2 flex-wrap">
                    {searchable && (
                        <div className="relative flex-1 min-w-[200px] max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={searchPlaceholder}
                                value={searchTerm}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                className="pl-9"
                            />
                            {searchTerm && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                                    onClick={() => handleSearchChange('')}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    )}

                    {selectedRows.size > 0 && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{selectedRows.size} selected</span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSelectAll(false)}
                            >
                                Clear
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* Table */}
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            {selectable && (
                                <TableHead className="w-12">
                                    <Checkbox
                                        checked={isAllSelected}
                                        onCheckedChange={handleSelectAll}
                                        aria-label="Select all"
                                        className={cn(
                                            isSomeSelected && "data-[state=checked]:bg-primary/50"
                                        )}
                                    />
                                </TableHead>
                            )}
                            {columns.map((column) => (
                                <TableHead
                                    key={column.key}
                                    className={cn(
                                        column.headerClassName,
                                        compact && "py-2"
                                    )}
                                >
                                    {column.sortable ? (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="-ml-3 h-8 hover:bg-transparent"
                                            onClick={() => handleSort(column.key)}
                                        >
                                            <span className="font-medium">{column.label}</span>
                                            {sortColumn === column.key ? (
                                                sortDirection === 'asc' ? (
                                                    <ChevronUp className="ml-2 h-4 w-4" />
                                                ) : (
                                                    <ChevronDown className="ml-2 h-4 w-4" />
                                                )
                                            ) : (
                                                <ChevronsUpDown className="ml-2 h-4 w-4 text-muted-foreground/50" />
                                            )}
                                        </Button>
                                    ) : (
                                        column.label
                                    )}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedData.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length + (selectable ? 1 : 0)}
                                    className="h-24 text-center"
                                >
                                    <div className="text-muted-foreground">
                                        No results found for "{searchTerm}"
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            sortedData.map((item, index) => {
                                const isSelected = selectedRows.has(index);
                                return (
                                    <TableRow
                                        key={index}
                                        className={cn(
                                            onRowClick && 'cursor-pointer hover:bg-muted/50',
                                            isSelected && 'bg-muted/50',
                                            rowClassName?.(item, index),
                                            compact && "h-12"
                                        )}
                                        onClick={() => onRowClick?.(item, index)}
                                        data-state={isSelected ? 'selected' : undefined}
                                    >
                                        {selectable && (
                                            <TableCell className="w-12" onClick={(e) => e.stopPropagation()}>
                                                <Checkbox
                                                    checked={isSelected}
                                                    onCheckedChange={(checked) => handleSelectRow(index, checked as boolean)}
                                                    aria-label={`Select row ${index + 1}`}
                                                />
                                            </TableCell>
                                        )}
                                        {columns.map((column) => (
                                            <TableCell
                                                key={column.key}
                                                className={cn(
                                                    column.className,
                                                    compact && "py-2"
                                                )}
                                            >
                                                {column.render
                                                    ? column.render(item, index)
                                                    : item[column.key]}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="text-sm text-muted-foreground">
                        Showing{' '}
                        <span className="font-medium">
                            {(pagination.currentPage - 1) * pagination.perPage + 1}
                        </span>{' '}
                        to{' '}
                        <span className="font-medium">
                            {Math.min(
                                pagination.currentPage * pagination.perPage,
                                pagination.total
                            )}
                        </span>{' '}
                        of <span className="font-medium">{pagination.total}</span> results
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Per page selector */}
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground whitespace-nowrap">
                                Rows per page:
                            </span>
                            <Select
                                value={pagination.perPage.toString()}
                                onValueChange={(value) =>
                                    pagination.onPerPageChange(parseInt(value))
                                }
                            >
                                <SelectTrigger className="w-16 h-8">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="10">10</SelectItem>
                                    <SelectItem value="25">25</SelectItem>
                                    <SelectItem value="50">50</SelectItem>
                                    <SelectItem value="100">100</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Page navigation */}
                        <div className="flex items-center gap-1">
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => pagination.onPageChange(1)}
                                disabled={pagination.currentPage === 1}
                            >
                                <ChevronsLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
                                disabled={pagination.currentPage === 1}
                            >
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-sm text-muted-foreground px-2 whitespace-nowrap">
                                Page {pagination.currentPage} of {pagination.totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
                                disabled={pagination.currentPage === pagination.totalPages}
                            >
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => pagination.onPageChange(pagination.totalPages)}
                                disabled={pagination.currentPage === pagination.totalPages}
                            >
                                <ChevronsRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import type { DataTableSort } from '@/components/shared/DataTable';
import { PER_PAGE_OPTIONS } from '@/components/shared/dataTableColumns';

const SEARCH_DELAY_MS = 300;

type ParamChanges = Record<string, string | undefined>;

export interface TableFilters {
    page: number;
    per_page?: number;
    search?: string;
    sort_by?: string;
    sort_direction?: string;
}

function readFilters(params: URLSearchParams): TableFilters {
    const perPage = Number(params.get('per_page'));

    return {
        page: Math.max(Number(params.get('page')) || 1, 1),
        per_page: PER_PAGE_OPTIONS.includes(perPage) ? perPage : undefined,
        search: params.get('search') ?? undefined,
        sort_by: params.get('sort_by') ?? undefined,
        sort_direction: params.get('sort_direction') ?? undefined,
    };
}

function readSort(filters: TableFilters): DataTableSort | undefined {
    return filters.sort_by === undefined
        ? undefined
        : {
              field: filters.sort_by,
              direction: filters.sort_direction === 'desc' ? 'desc' : 'asc',
          };
}

/**
 * Keeps page, size, search, and sorting of a data table in the URL.
 */
export function useTableParams() {
    const [params, setParams] = useSearchParams();
    const [searchInput, setSearchInput] = useState(params.get('search') ?? '');
    const searchTimer = useRef<number | undefined>(undefined);
    const filters = readFilters(params);

    const updateParams = useCallback(
        (changes: ParamChanges) => {
            setParams(
                (current) => {
                    const next = new URLSearchParams(current);

                    Object.entries(changes).forEach(([key, value]) => {
                        if (value === undefined || value === '') {
                            next.delete(key);
                        } else {
                            next.set(key, value);
                        }
                    });

                    return next;
                },
                { replace: true },
            );
        },
        [setParams],
    );

    useEffect(() => () => window.clearTimeout(searchTimer.current), []);

    const changeSearch = (value: string) => {
        setSearchInput(value);
        window.clearTimeout(searchTimer.current);
        searchTimer.current = window.setTimeout(
            () => updateParams({ search: value.trim(), page: undefined }),
            SEARCH_DELAY_MS,
        );
    };

    return {
        params,
        filters,
        searchInput,
        changeSearch,
        updateParams,
        tableProps: {
            sort: readSort(filters),
            onPageChange: (page: number) => updateParams({ page: String(page) }),
            onPerPageChange: (perPage: number) =>
                updateParams({ per_page: String(perPage), page: undefined }),
            onSortChange: ({ field, direction }: DataTableSort) =>
                updateParams({ sort_by: field, sort_direction: direction, page: undefined }),
        },
    };
}

/**
 * Moves back to the last page when deleting a row empties the page being viewed.
 */
export function useLastPageCorrection(
    page: number,
    isPageEmpty: boolean,
    lastPage: number,
    isStale: boolean,
    updateParams: (changes: ParamChanges) => void,
): void {
    useEffect(() => {
        if (isPageEmpty && page > 1 && !isStale) {
            updateParams({ page: String(lastPage) });
        }
    }, [isPageEmpty, page, lastPage, isStale, updateParams]);
}

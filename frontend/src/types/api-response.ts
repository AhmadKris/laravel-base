import type { components } from './api';

type Schemas = components['schemas'];

export type AuthenticatedUser = Schemas['AuthenticatedUserResource'];

export interface ApiEnvelope<TData> {
    success: boolean;
    message: string;
    data: TData;
    meta: null;
}

export interface PaginationMeta {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    from: number | null;
    to: number | null;
}

export interface PaginatedEnvelope<TData> {
    success: boolean;
    message: string;
    data: TData[];
    meta: { pagination: PaginationMeta };
}

import type { components } from './api';

type Schemas = components['schemas'];

export type AuthenticatedUser = Schemas['AuthenticatedUserResource'];
export type AuditLog = Schemas['AuditLogResource'];
export type Role = Schemas['RoleResource'];
export type Permission = Schemas['PermissionResource'];
export type StoreRolePayload = Schemas['StoreRoleRequest'];
export type UpdateRolePayload = Schemas['UpdateRoleRequest'];
export type User = Schemas['UserResource'];
export type StoreUserPayload = Schemas['StoreUserRequest'];
export type UpdateUserPayload = Schemas['UpdateUserRequest'];
export type ForgotPasswordPayload = Schemas['ForgotPasswordRequest'];
export type ResetPasswordPayload = Schemas['ResetPasswordRequest'];
export type ChangePasswordPayload = Schemas['ChangePasswordRequest'];

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

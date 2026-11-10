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

// Scramble cannot infer the JSON cast of `value`, so these two types are written by hand.
export type ConfigurationValue =
    string | number | boolean | null | ConfigurationValue[] | { [key: string]: ConfigurationValue };

export type SystemConfiguration = Omit<Schemas['SystemConfigurationResource'], 'value'> & {
    value: ConfigurationValue;
};

export type BrandingAsset = 'logo' | 'logo-dark' | 'favicon';

export interface LogoDisplay {
    show_name: boolean;
    background: 'transparent' | 'white' | 'primary';
    size: 'small' | 'medium' | 'large';
}

type UploadedFile = { version: number } | null;

export interface Branding {
    logo: UploadedFile;
    logo_dark: UploadedFile;
    favicon: UploadedFile;
    display: LogoDisplay;
}

export interface UpdateConfigurationPayload {
    value: string | boolean | null;
    version: number;
}

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

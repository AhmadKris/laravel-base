import type { components } from './api';

type Schemas = components['schemas'];

export type AuthenticatedUser = Schemas['AuthenticatedUserResource'];
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

// Scramble cannot infer JSON columns, so the types below that hold them are written by hand.
export type JsonValue =
    string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export type ConfigurationValue = JsonValue;

// Scramble types the subject label as unknown and the properties as an empty object.
export type AuditLog = Omit<Schemas['AuditLogResource'], 'subject' | 'properties'> & {
    subject: { type: string; id: string | number | null; label: string | null } | null;
    properties: Record<string, JsonValue> | null;
};

export type AuditModule = Schemas['AuditModule'];
export type Notification = Schemas['NotificationResource'];
export type NotificationCategory = Schemas['NotificationCategory'];

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

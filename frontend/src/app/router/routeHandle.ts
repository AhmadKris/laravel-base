import type { Params } from 'react-router';

export interface Crumb {
    label: string;
    to: string;
}

/**
 * Route metadata: the page title for the tab and the breadcrumb, and the pages above it.
 */
export interface RouteHandle {
    title: string;
    parents?: (params: Params) => Crumb[];
}

export const USERS_CRUMB: Crumb = { label: 'Pengguna', to: '/users' };
export const ROLES_CRUMB: Crumb = { label: 'Role', to: '/roles' };
export const AUDIT_LOGS_CRUMB: Crumb = { label: 'Audit Log', to: '/audit-logs' };

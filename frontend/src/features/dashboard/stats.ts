import type { StatFilters } from './services/dashboardService';

const ACTIVITY_WINDOW_DAYS = 7;

export interface DashboardStat {
    label: string;
    permission: string;
    path: string;
    filters: StatFilters;
}

function daysAgo(days: number): string {
    const date = new Date();

    date.setUTCDate(date.getUTCDate() - days);

    return date.toISOString().slice(0, 10);
}

export function getDashboardStats(): DashboardStat[] {
    return [
        {
            label: 'Pengguna aktif',
            permission: 'user.view',
            path: '/users',
            filters: { status: 'active' },
        },
        { label: 'Role', permission: 'role.view', path: '/roles', filters: {} },
        {
            label: `Aktivitas ${ACTIVITY_WINDOW_DAYS} hari terakhir`,
            permission: 'audit.view',
            path: '/audit-logs',
            filters: { date_from: daysAgo(ACTIVITY_WINDOW_DAYS) },
        },
    ];
}

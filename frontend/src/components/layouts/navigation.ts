import {
    Building2,
    House,
    type LucideIcon,
    ScrollText,
    Settings,
    ShieldCheck,
    Users,
} from 'lucide-react';

export interface NavigationItem {
    label: string;
    to: string;
    icon: LucideIcon;
    permission?: string;
}

export interface NavigationSection {
    label?: string;
    items: NavigationItem[];
}

export const navigationSections: NavigationSection[] = [
    { items: [{ label: 'Beranda', to: '/', icon: House }] },
    {
        label: 'Administrasi',
        items: [
            { label: 'Pengguna', to: '/users', icon: Users, permission: 'user.view' },
            {
                label: 'Departemen',
                to: '/departments',
                icon: Building2,
                permission: 'department.view',
            },
            { label: 'Role', to: '/roles', icon: ShieldCheck, permission: 'role.view' },
            { label: 'Audit Log', to: '/audit-logs', icon: ScrollText, permission: 'audit.view' },
            {
                label: 'Pengaturan',
                to: '/settings',
                icon: Settings,
                permission: 'system_config.view',
            },
        ],
    },
];

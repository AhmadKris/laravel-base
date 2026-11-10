const GROUP_LABELS: Record<string, string> = {
    user: 'Pengguna',
    role: 'Role',
    permission: 'Permission',
    system_config: 'Pengaturan sistem',
    audit: 'Audit Log',
};

export const SUPER_ADMIN_ROLE = 'Super Admin';

export interface PermissionGroup {
    label: string;
    permissions: string[];
}

export function groupPermissions(names: string[]): PermissionGroup[] {
    const groups = new Map<string, string[]>();

    for (const name of names) {
        const key = name.split('.')[0];

        groups.set(key, [...(groups.get(key) ?? []), name]);
    }

    return [...groups.entries()].map(([key, permissions]) => ({
        label: GROUP_LABELS[key] ?? key,
        permissions,
    }));
}

const GROUP_ORDER = ['user', 'role', 'permission', 'system_config', 'audit'];

const GROUP_LABELS: Record<string, string> = {
    user: 'Pengguna',
    role: 'Role',
    permission: 'Permission',
    system_config: 'Pengaturan sistem',
    audit: 'Audit Log',
};

export interface PermissionMeta {
    name: string;
    label: string;
    description: string;
    requires?: readonly string[];
}

const PERMISSION_DETAILS: Record<string, Omit<PermissionMeta, 'name'>> = {
    'user.view': {
        label: 'Lihat pengguna',
        description: 'Membuka menu, daftar, dan detail pengguna.',
    },
    'user.create': {
        label: 'Tambah pengguna',
        description: 'Membuat akun pengguna baru.',
        requires: ['user.view'],
    },
    'user.update': {
        label: 'Ubah pengguna',
        description: 'Mengubah data akun dan mengaktifkan kembali pengguna.',
        requires: ['user.view'],
    },
    'user.delete': {
        label: 'Nonaktifkan pengguna',
        description: 'Menonaktifkan akun pengguna dan mengakhiri sesinya.',
        requires: ['user.view'],
    },
    'user.assign_role': {
        label: 'Tetapkan role pengguna',
        description: 'Mengatur role yang dimiliki pengguna lain.',
        requires: ['user.view', 'role.view'],
    },
    'role.view': {
        label: 'Lihat role',
        description: 'Membuka menu, daftar, dan detail role.',
    },
    'role.create': {
        label: 'Tambah role',
        description: 'Membuat role kustom baru.',
        requires: ['role.view'],
    },
    'role.update': {
        label: 'Ubah role',
        description: 'Mengubah nama role kustom.',
        requires: ['role.view'],
    },
    'role.delete': {
        label: 'Hapus role',
        description: 'Menghapus role kustom yang belum dipakai pengguna.',
        requires: ['role.view'],
    },
    'permission.view': {
        label: 'Lihat daftar permission',
        description: 'Melihat seluruh opsi permission saat mengelola role.',
    },
    'permission.assign': {
        label: 'Atur permission role',
        description: 'Menambahkan atau mencabut hak akses pada role.',
        requires: ['role.view', 'permission.view'],
    },
    'system_config.view': {
        label: 'Lihat pengaturan',
        description: 'Membuka menu dan membaca pengaturan aplikasi.',
    },
    'system_config.update': {
        label: 'Ubah pengaturan sistem',
        description: 'Mengubah profil perusahaan, lokalisasi, dan tampilan merek.',
        requires: ['system_config.view'],
    },
    'system_config.feature_flags': {
        label: 'Kelola fitur sistem',
        description: 'Mengaktifkan atau menonaktifkan modul dan feature flag.',
        requires: ['system_config.view'],
    },
    'audit.view': {
        label: 'Lihat audit log',
        description: 'Membuka menu, daftar, dan detail jejak aktivitas sistem.',
    },
};

export const SUPER_ADMIN_ROLE = 'Super Admin';

export interface PermissionGroup {
    key: string;
    label: string;
    permissions: string[];
}

export function describePermission(name: string): PermissionMeta {
    const details = PERMISSION_DETAILS[name];

    if (details !== undefined) {
        return { name, ...details };
    }

    const action = name.split('.').slice(1).join(' ').replaceAll('_', ' ');

    return {
        name,
        label: action !== '' ? action : name,
        description: `Hak akses untuk ${name}.`,
    };
}

export function groupPermissions(names: string[]): PermissionGroup[] {
    const groups = new Map<string, string[]>();

    for (const name of names) {
        const key = name.split('.')[0];

        groups.set(key, [...(groups.get(key) ?? []), name]);
    }

    return [...groups.entries()]
        .sort(([first], [second]) => {
            const firstRank = GROUP_ORDER.indexOf(first);
            const secondRank = GROUP_ORDER.indexOf(second);

            if (firstRank !== -1 && secondRank !== -1) {
                return firstRank - secondRank;
            }

            if (firstRank !== -1) {
                return -1;
            }

            if (secondRank !== -1) {
                return 1;
            }

            return first.localeCompare(second);
        })
        .map(([key, permissions]) => ({
            key,
            label: GROUP_LABELS[key] ?? key,
            permissions,
        }));
}

export function addPermissionsWithPrerequisites(
    current: string[],
    additions: string[],
    available: ReadonlySet<string>,
    canGrant: (name: string) => boolean,
): string[] {
    const next = new Set(current);
    const queue = [...additions];

    while (queue.length > 0) {
        const target = queue.shift();

        if (target === undefined || !available.has(target) || next.has(target)) {
            continue;
        }

        if (!canGrant(target)) {
            continue;
        }

        next.add(target);

        for (const requirement of describePermission(target).requires ?? []) {
            if (!next.has(requirement)) {
                queue.push(requirement);
            }
        }
    }

    return [...next];
}

export function removePermissionsWithDependents(current: string[], removals: string[]): string[] {
    const removed = new Set(removals);
    let changed = true;

    while (changed) {
        changed = false;

        for (const candidate of current) {
            if (removed.has(candidate)) {
                continue;
            }

            const requiresRemoved = (describePermission(candidate).requires ?? []).some((req) =>
                removed.has(req),
            );

            if (requiresRemoved) {
                removed.add(candidate);
                changed = true;
            }
        }
    }

    return current.filter((item) => !removed.has(item));
}

export function findSelectedDependents(target: string, selected: string[]): PermissionMeta[] {
    return selected
        .filter((name) => (describePermission(name).requires ?? []).includes(target))
        .map(describePermission);
}

export function diffPermissions(
    initial: string[],
    next: string[],
): { added: string[]; removed: string[] } {
    const initialSet = new Set(initial);
    const nextSet = new Set(next);

    return {
        added: next.filter((name) => !initialSet.has(name)),
        removed: initial.filter((name) => !nextSet.has(name)),
    };
}

import type { Permission } from '@/types/api-response';

const FIXTURES: Omit<Permission, 'id'>[] = [
    {
        name: 'user.view',
        label: 'Lihat pengguna',
        description: 'Membuka menu, daftar, dan detail pengguna.',
        group: 'user',
        group_label: 'Pengguna',
        requires: [],
    },
    {
        name: 'user.create',
        label: 'Tambah pengguna',
        description: 'Membuat akun pengguna baru.',
        group: 'user',
        group_label: 'Pengguna',
        requires: ['user.view'],
    },
    {
        name: 'user.assign_role',
        label: 'Tetapkan role pengguna',
        description: 'Mengatur role yang dimiliki pengguna lain.',
        group: 'user',
        group_label: 'Pengguna',
        requires: ['user.view', 'role.view'],
    },
    {
        name: 'role.view',
        label: 'Lihat role',
        description: 'Membuka menu, daftar, dan detail role.',
        group: 'role',
        group_label: 'Role',
        requires: [],
    },
    {
        name: 'audit.view',
        label: 'Lihat audit log',
        description: 'Membuka menu, daftar, dan detail jejak aktivitas sistem.',
        group: 'audit',
        group_label: 'Audit Log',
        requires: [],
    },
];

/** Permissions as the API describes them, in catalog order, for tests. */
export function permissionFixtures(names: string[]): Permission[] {
    return FIXTURES.filter(({ name }) => names.includes(name)).map((permission) => ({
        id: FIXTURES.indexOf(permission) + 1,
        ...permission,
    }));
}

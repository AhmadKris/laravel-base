import type { AuditModule } from '@/types/api-response';

const UNKNOWN_EVENT = 'melakukan perubahan';

// Written as what the actor did, so it reads as "<name> <action>" in the activity feed.
const EVENT_ACTIONS: Record<string, string> = {
    'auth.login': 'masuk ke aplikasi',
    'auth.login_failed': 'gagal masuk',
    'auth.logout': 'keluar dari aplikasi',
    'auth.password_changed': 'mengubah password',
    'auth.password_reset': 'mereset password',
    'permission.assigned': 'memberikan permission',
    'permission.revoked': 'mencabut permission',
    'role.created': 'membuat role',
    'role.updated': 'memperbarui role',
    'role.deleted': 'menghapus role',
    'system.configuration_updated': 'memperbarui pengaturan sistem',
    'system.branding_updated': 'mengunggah logo atau favicon',
    'system.branding_removed': 'menghapus logo atau favicon',
    'user.created': 'menambahkan pengguna',
    'user.updated': 'memperbarui data pengguna',
    'user.deactivated': 'menonaktifkan pengguna',
    'user.role_assigned': 'memberikan role kepada pengguna',
    'user.role_removed': 'mencabut role pengguna',
};

export function describeEvent(event: string | null): string {
    return EVENT_ACTIONS[event ?? ''] ?? UNKNOWN_EVENT;
}

export function eventTitle(event: string | null): string {
    const action = describeEvent(event);

    return action.charAt(0).toUpperCase() + action.slice(1);
}

export const AUDIT_MODULES: { value: AuditModule; label: string }[] = [
    { value: 'auth', label: 'Autentikasi' },
    { value: 'user', label: 'Pengguna' },
    { value: 'role', label: 'Role' },
    { value: 'permission', label: 'Permission' },
    { value: 'system', label: 'Sistem' },
];

const SUBJECT_TYPES: Record<string, string> = {
    user: 'Pengguna',
    role: 'Role',
    system_configuration: 'Pengaturan',
};

export function subjectTypeLabel(type: string): string {
    return SUBJECT_TYPES[type] ?? type;
}

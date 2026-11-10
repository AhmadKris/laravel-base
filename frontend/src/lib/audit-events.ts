import type { AuditModule } from '@/types/api-response';

const UNKNOWN_EVENT = 'melakukan perubahan';

/**
 * What the actor did, from the label the API sends, so it reads as "<name> <action>".
 */
export function describeEvent(label: string | null): string {
    return label ?? UNKNOWN_EVENT;
}

export function eventTitle(label: string | null): string {
    const action = describeEvent(label);

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

import type { Permission } from '@/types/api-response';

export const SUPER_ADMIN_ROLE = 'Super Admin';

/** Copying a role is only useful when its permissions can be copied too. */
export const DUPLICATE_ROLE_PERMISSIONS = ['role.create', 'permission.view', 'permission.assign'];

/** Permissions from the API, keyed by name. */
export type PermissionCatalog = ReadonlyMap<string, Permission>;

export interface PermissionGroup<T extends Permission = Permission> {
    key: string;
    label: string;
    permissions: T[];
}

/** The actions shown as matrix columns; other actions of a module are listed after them. */
export const STANDARD_ACTIONS = [
    { action: 'view', label: 'Lihat' },
    { action: 'create', label: 'Tambah' },
    { action: 'update', label: 'Ubah' },
    { action: 'delete', label: 'Hapus' },
] as const;

const STANDARD_ACTION_NAMES = new Set<string>(STANDARD_ACTIONS.map(({ action }) => action));

export function permissionAction(name: string): string {
    return name.slice(name.indexOf('.') + 1);
}

export function isStandardAction(name: string): boolean {
    return STANDARD_ACTION_NAMES.has(permissionAction(name));
}

export function toCatalog(permissions: Permission[]): PermissionCatalog {
    return new Map(permissions.map((permission) => [permission.name, permission]));
}

/** Groups permissions by module, keeping the order the API returns them in. */
export function groupPermissions<T extends Permission>(permissions: T[]): PermissionGroup<T>[] {
    const groups = new Map<string, PermissionGroup<T>>();

    for (const permission of permissions) {
        const group = groups.get(permission.group);

        if (group === undefined) {
            groups.set(permission.group, {
                key: permission.group,
                label: permission.group_label,
                permissions: [permission],
            });
        } else {
            group.permissions.push(permission);
        }
    }

    return [...groups.values()];
}

export function addPermissionsWithPrerequisites(
    current: string[],
    additions: string[],
    catalog: PermissionCatalog,
    canGrant: (name: string) => boolean,
): string[] {
    const next = new Set(current);
    const queue = [...additions];

    while (queue.length > 0) {
        const target = queue.shift();
        const permission = target === undefined ? undefined : catalog.get(target);

        if (permission === undefined || next.has(permission.name) || !canGrant(permission.name)) {
            continue;
        }

        next.add(permission.name);
        queue.push(...permission.requires.filter((requirement) => !next.has(requirement)));
    }

    return [...next];
}

export function removePermissionsWithDependents(
    current: string[],
    removals: string[],
    catalog: PermissionCatalog,
): string[] {
    const removed = new Set(removals);
    let changed = true;

    while (changed) {
        changed = false;

        for (const candidate of current) {
            if (removed.has(candidate)) {
                continue;
            }

            const requires = catalog.get(candidate)?.requires ?? [];

            if (requires.some((requirement) => removed.has(requirement))) {
                removed.add(candidate);
                changed = true;
            }
        }
    }

    return current.filter((item) => !removed.has(item));
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

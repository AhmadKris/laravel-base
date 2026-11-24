import { describe, expect, it } from 'vitest';
import { permissionFixtures } from './permissionFixtures';
import {
    addPermissionsWithPrerequisites,
    diffPermissions,
    groupPermissions,
    isStandardAction,
    removePermissionsWithDependents,
    toCatalog,
} from './permissionGroups';

const catalog = toCatalog(
    permissionFixtures(['user.view', 'user.create', 'user.assign_role', 'role.view', 'audit.view']),
);

describe('permissionGroups', () => {
    it('groups permissions by module in the order the API returns them', () => {
        const groups = groupPermissions(
            permissionFixtures(['audit.view', 'user.view', 'role.view']),
        );

        expect(
            groups.map((group) => [group.label, group.permissions.map(({ name }) => name)]),
        ).toEqual([
            ['Pengguna', ['user.view']],
            ['Role', ['role.view']],
            ['Audit Log', ['audit.view']],
        ]);
    });

    it('tells the common actions apart from the special ones', () => {
        expect(isStandardAction('user.delete')).toBe(true);
        expect(isStandardAction('user.assign_role')).toBe(false);
        expect(isStandardAction('system_config.feature_flags')).toBe(false);
    });

    it('adds missing prerequisites when enabling a dependent permission', () => {
        expect(
            addPermissionsWithPrerequisites([], ['user.assign_role'], catalog, () => true),
        ).toEqual(['user.assign_role', 'user.view', 'role.view']);
    });

    it('removes dependent permissions when revoking a prerequisite', () => {
        expect(
            removePermissionsWithDependents(
                ['user.view', 'user.create', 'user.assign_role', 'role.view', 'audit.view'],
                ['user.view'],
                catalog,
            ),
        ).toEqual(['role.view', 'audit.view']);
    });

    it('computes added and removed permissions', () => {
        expect(diffPermissions(['user.view', 'role.view'], ['role.view', 'audit.view'])).toEqual({
            added: ['audit.view'],
            removed: ['user.view'],
        });
    });
});

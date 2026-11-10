import { describe, expect, it } from 'vitest';
import {
    addPermissionsWithPrerequisites,
    describePermission,
    diffPermissions,
    groupPermissions,
    removePermissionsWithDependents,
} from './permissionGroups';

describe('permissionGroups', () => {
    it('describes known permissions in Indonesian and falls back for custom names', () => {
        expect(describePermission('user.assign_role')).toMatchObject({
            name: 'user.assign_role',
            label: 'Tetapkan role pengguna',
            requires: ['user.view', 'role.view'],
        });

        expect(describePermission('report.export_csv')).toEqual({
            name: 'report.export_csv',
            label: 'export csv',
            description: 'Hak akses untuk report.export_csv.',
        });
    });

    it('groups modules in application order', () => {
        const groups = groupPermissions(['audit.view', 'custom.run', 'user.view', 'role.create']);

        expect(groups.map((group) => group.label)).toEqual([
            'Pengguna',
            'Role',
            'Audit Log',
            'custom',
        ]);
    });

    it('adds missing prerequisites when enabling a dependent permission', () => {
        const available = new Set(['user.view', 'role.view', 'user.assign_role', 'audit.view']);

        const next = addPermissionsWithPrerequisites(
            [],
            ['user.assign_role'],
            available,
            () => true,
        );

        expect(next).toEqual(['user.assign_role', 'user.view', 'role.view']);
    });

    it('removes dependent permissions when revoking a prerequisite', () => {
        const next = removePermissionsWithDependents(
            ['user.view', 'user.create', 'user.assign_role', 'role.view', 'audit.view'],
            ['user.view'],
        );

        expect(next).toEqual(['role.view', 'audit.view']);
    });

    it('computes added and removed permissions cleanly', () => {
        expect(diffPermissions(['user.view', 'role.view'], ['role.view', 'audit.view'])).toEqual({
            added: ['audit.view'],
            removed: ['user.view'],
        });
    });
});

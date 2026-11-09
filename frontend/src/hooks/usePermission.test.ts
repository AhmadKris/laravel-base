import { renderHook } from '@testing-library/react';
import { expect, it } from 'vitest';
import { useAuthStore } from '@/stores/auth-store';
import { makeUser } from '@/test/utils';
import { usePermission } from './usePermission';

it('denies everything without a user', () => {
    const { result } = renderHook(() => usePermission());

    expect(result.current.can('user.view')).toBe(false);
    expect(result.current.canAny(['user.view'])).toBe(false);
});

it('follows the permissions from the backend', () => {
    useAuthStore.getState().setUser(makeUser(['user.view', 'role.view']));

    const { result } = renderHook(() => usePermission());

    expect(result.current.can('user.view')).toBe(true);
    expect(result.current.can('user.create')).toBe(false);
    expect(result.current.canAny(['user.create', 'role.view'])).toBe(true);
    expect(result.current.canAll(['user.create', 'role.view'])).toBe(false);
    expect(result.current.canAll(['user.view', 'role.view'])).toBe(true);
});

import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Toaster } from '@/components/ui/sonner';
import { useThemeSync } from '@/hooks/useThemeSync';
import themeInitScript from '../../public/theme-init.js?raw';
import { server } from '@/test/server';
import { makeUser, renderApp } from '@/test/utils';
import { useThemeStore } from './theme-store';

type ChangeListener = () => void;

function stubSystemTheme(prefersDark: boolean) {
    const listeners = new Set<ChangeListener>();
    const media = {
        matches: prefersDark,
        addEventListener: (_event: string, listener: ChangeListener) => listeners.add(listener),
        removeEventListener: (_event: string, listener: ChangeListener) =>
            listeners.delete(listener),
    };

    vi.stubGlobal(
        'matchMedia',
        vi.fn(() => media),
    );

    return {
        change(nextPrefersDark: boolean) {
            media.matches = nextPrefersDark;
            listeners.forEach((listener) => listener());
        },
    };
}

const originalMatchMedia = window.matchMedia;
const isDark = () => document.documentElement.classList.contains('dark');

beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    useThemeStore.setState({ preference: 'system', resolved: 'light' });
});

afterEach(() => {
    vi.stubGlobal('matchMedia', originalMatchMedia);
    localStorage.clear();
    document.documentElement.classList.remove('dark');
});

describe('theme preference', () => {
    it('applies and remembers an explicit choice', () => {
        useThemeStore.getState().setPreference('dark');

        expect(isDark()).toBe(true);
        expect(localStorage.getItem('theme')).toBe('dark');

        useThemeStore.getState().setPreference('light');

        expect(isDark()).toBe(false);
        expect(localStorage.getItem('theme')).toBe('light');
    });

    it('forgets the choice and uses the system theme for "system"', () => {
        stubSystemTheme(true);
        useThemeStore.getState().setPreference('light');

        useThemeStore.getState().setPreference('system');

        expect(localStorage.getItem('theme')).toBeNull();
        expect(isDark()).toBe(true);
        expect(useThemeStore.getState().resolved).toBe('dark');
    });

    it('keeps working when storage is blocked', () => {
        vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
            throw new DOMException('blocked', 'SecurityError');
        });

        useThemeStore.getState().setPreference('dark');

        expect(isDark()).toBe(true);
    });
});

describe('theme sync', () => {
    it('follows the operating system while set to system', () => {
        const system = stubSystemTheme(false);
        renderHook(useThemeSync);

        act(() => system.change(true));

        expect(isDark()).toBe(true);
    });

    it('ignores the operating system after an explicit choice', () => {
        const system = stubSystemTheme(false);
        renderHook(useThemeSync);
        act(() => useThemeStore.getState().setPreference('light'));

        act(() => system.change(true));

        expect(isDark()).toBe(false);
    });

    it('applies a choice made in another tab', () => {
        renderHook(useThemeSync);
        localStorage.setItem('theme', 'dark');

        act(() => {
            window.dispatchEvent(new StorageEvent('storage', { key: 'theme' }));
        });

        expect(isDark()).toBe(true);
        expect(useThemeStore.getState().preference).toBe('dark');
    });
});

describe('script that runs before first paint', () => {
    const runScript = () => new Function(themeInitScript)();

    it.each([
        ['dark', false, true],
        ['light', true, false],
        [null, true, true],
        [null, false, false],
    ])('with stored %s and system dark %s sets dark to %s', (stored, prefersDark, expected) => {
        stubSystemTheme(prefersDark);
        if (stored !== null) {
            localStorage.setItem('theme', stored);
        }

        runScript();

        expect(isDark()).toBe(expected);
    });
});

describe('theme controls', () => {
    it('switches the theme from the account menu', async () => {
        server.use(
            http.get('*/api/v1/auth/user', () =>
                HttpResponse.json({ success: true, message: '', data: makeUser(), meta: null }),
            ),
        );
        const user = userEvent.setup();

        renderApp('/');
        await user.click(await screen.findByRole('button', { name: /Menu akun/ }));
        await user.click(await screen.findByRole('menuitemradio', { name: 'Gelap' }));

        expect(isDark()).toBe(true);
    });

    it('renders toasts in the active theme', async () => {
        useThemeStore.setState({ resolved: 'dark' });
        render(<Toaster />);

        act(() => {
            toast('Pesan uji');
        });

        await screen.findByText('Pesan uji');
        expect(document.querySelector('[data-sonner-toaster]')).toHaveAttribute(
            'data-sonner-theme',
            'dark',
        );
    });
});

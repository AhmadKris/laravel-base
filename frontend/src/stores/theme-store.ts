import { create } from 'zustand';

export type ThemePreference = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

// public/theme-init.js reads the same key before React starts.
const STORAGE_KEY = 'theme';

export const DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)';

// Storage can be blocked by browser policy; the theme then falls back to the system setting.
function readPreference(): ThemePreference {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);

        return stored === 'light' || stored === 'dark' ? stored : 'system';
    } catch {
        return 'system';
    }
}

function writePreference(preference: ThemePreference): void {
    try {
        if (preference === 'system') {
            localStorage.removeItem(STORAGE_KEY);
        } else {
            localStorage.setItem(STORAGE_KEY, preference);
        }
    } catch {
        return;
    }
}

function resolve(preference: ThemePreference): ResolvedTheme {
    if (preference !== 'system') {
        return preference;
    }

    return window.matchMedia(DARK_MEDIA_QUERY).matches ? 'dark' : 'light';
}

function applyTheme(preference: ThemePreference): ResolvedTheme {
    const resolved = resolve(preference);

    document.documentElement.classList.toggle('dark', resolved === 'dark');

    return resolved;
}

interface ThemeState {
    preference: ThemePreference;
    resolved: ResolvedTheme;
    setPreference: (preference: ThemePreference) => void;
    syncWithEnvironment: () => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
    preference: readPreference(),
    resolved: resolve(readPreference()),
    setPreference: (preference) => {
        writePreference(preference);
        set({ preference, resolved: applyTheme(preference) });
    },
    syncWithEnvironment: () => {
        const preference = readPreference();

        set({ preference, resolved: applyTheme(preference) });
    },
}));

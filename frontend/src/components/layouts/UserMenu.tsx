import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';
import { Link } from 'react-router';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { authService } from '@/features/authentication/services/authService';
import { notifyError } from '@/lib/notify';
import { useAuthStore } from '@/stores/auth-store';
import { type ThemePreference, useThemeStore } from '@/stores/theme-store';

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
    { value: 'light', label: 'Terang' },
    { value: 'dark', label: 'Gelap' },
    { value: 'system', label: 'Ikuti sistem' },
];

export function UserMenu() {
    const userName = useAuthStore((state) => state.user?.name);
    const setSignedOut = useAuthStore((state) => state.setSignedOut);
    const themePreference = useThemeStore((state) => state.preference);
    const setThemePreference = useThemeStore((state) => state.setPreference);
    const queryClient = useQueryClient();

    const logout = useMutation({
        mutationFn: authService.logout,
        onSuccess: () => {
            setSignedOut();
            queryClient.clear();
        },
        onError: notifyError,
    });

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" aria-label={`Menu akun ${userName ?? ''}`}>
                    <UserAvatar name={userName ?? ''} size="sm" />
                    <span className="max-w-40 truncate">{userName}</span>
                    <ChevronDown aria-hidden="true" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                    <Link to="/change-password">Ubah password</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Tema</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                    value={themePreference}
                    onValueChange={(value) => setThemePreference(value as ThemePreference)}
                >
                    {THEME_OPTIONS.map((option) => (
                        <DropdownMenuRadioItem key={option.value} value={option.value}>
                            {option.label}
                        </DropdownMenuRadioItem>
                    ))}
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled={logout.isPending} onSelect={() => logout.mutate()}>
                    Keluar
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

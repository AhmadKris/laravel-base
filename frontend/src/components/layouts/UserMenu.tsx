import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { authService } from '@/features/authentication/services/authService';
import { notifyError } from '@/lib/notify';
import { useAuthStore } from '@/stores/auth-store';

export function UserMenu() {
    const userName = useAuthStore((state) => state.user?.name);
    const setSignedOut = useAuthStore((state) => state.setSignedOut);
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
                <Button variant="ghost" size="sm" aria-label={`Menu akun ${userName ?? ''}`}>
                    <span className="max-w-40 truncate">{userName}</span>
                    <ChevronDown aria-hidden="true" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                    <Link to="/change-password">Ubah password</Link>
                </DropdownMenuItem>
                <DropdownMenuItem disabled={logout.isPending} onSelect={() => logout.mutate()}>
                    Keluar
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

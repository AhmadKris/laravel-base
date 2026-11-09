import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router';
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
    const setGuest = useAuthStore((state) => state.setGuest);
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const logout = useMutation({
        mutationFn: authService.logout,
        onSuccess: () => {
            setGuest();
            queryClient.clear();
            void navigate('/login', { replace: true });
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
                <DropdownMenuItem disabled={logout.isPending} onSelect={() => logout.mutate()}>
                    Keluar
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

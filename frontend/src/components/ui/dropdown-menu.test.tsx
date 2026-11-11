import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Link } from 'react-router';
import { describe, expect, it } from 'vitest';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from './dropdown-menu';

describe('DropdownMenu', () => {
    it('gives menu items pointer cursor and mouse hover states', async () => {
        const user = userEvent.setup();

        render(
            <MemoryRouter>
                <DropdownMenu>
                    <DropdownMenuTrigger>Menu akun</DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem asChild>
                            <Link to="/change-password">Ubah password</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem variant="destructive">Hapus role</DropdownMenuItem>
                        <DropdownMenuLabel>Tema</DropdownMenuLabel>
                        <DropdownMenuCheckboxItem checked>Aktif</DropdownMenuCheckboxItem>
                        <DropdownMenuRadioGroup value="dark">
                            <DropdownMenuRadioItem value="dark">Gelap</DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger>Opsi lain</DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                                <DropdownMenuItem>Detail</DropdownMenuItem>
                            </DropdownMenuSubContent>
                        </DropdownMenuSub>
                    </DropdownMenuContent>
                </DropdownMenu>
            </MemoryRouter>,
        );

        await user.click(screen.getByRole('button', { name: 'Menu akun' }));

        const linkItem = await screen.findByRole('menuitem', { name: 'Ubah password' });
        const destructiveItem = screen.getByRole('menuitem', { name: 'Hapus role' });
        const checkboxItem = screen.getByRole('menuitemcheckbox', { name: 'Aktif' });
        const radioItem = screen.getByRole('menuitemradio', { name: 'Gelap' });
        const subTrigger = screen.getByRole('menuitem', { name: 'Opsi lain' });

        for (const item of [linkItem, checkboxItem, radioItem, subTrigger]) {
            expect(item).toHaveClass(
                'cursor-pointer',
                'hover:bg-accent',
                'data-[highlighted]:bg-accent',
            );
            expect(item).not.toHaveClass('cursor-default');
        }

        expect(destructiveItem).toHaveClass(
            'cursor-pointer',
            'data-[variant=destructive]:hover:bg-destructive/10',
            'data-[variant=destructive]:data-[highlighted]:bg-destructive/10',
        );
        expect(destructiveItem).not.toHaveClass('cursor-default');

        await user.hover(linkItem);
        expect(linkItem).toHaveAttribute('data-highlighted', '');

        await user.hover(screen.getByText('Tema'));
        expect(linkItem).not.toHaveAttribute('data-highlighted');

        await user.hover(radioItem);
        expect(radioItem).toHaveAttribute('data-highlighted', '');
    });
});

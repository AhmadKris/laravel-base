import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';

describe('Select', () => {
    it('gives trigger and options pointer cursor and mouse hover states', async () => {
        const user = userEvent.setup();

        render(
            <Select defaultValue="active">
                <SelectTrigger aria-label="Filter status">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="active">Aktif</SelectItem>
                    <SelectItem value="inactive">Nonaktif</SelectItem>
                </SelectContent>
            </Select>,
        );

        const trigger = screen.getByRole('combobox', { name: 'Filter status' });
        expect(trigger).toHaveClass(
            'cursor-pointer',
            'hover:bg-muted/50',
            'dark:hover:bg-input/50',
        );

        await user.click(trigger);

        const activeOption = await screen.findByRole('option', { name: 'Aktif' });
        const inactiveOption = screen.getByRole('option', { name: 'Nonaktif' });

        for (const option of [activeOption, inactiveOption]) {
            expect(option).toHaveClass(
                'cursor-pointer',
                'hover:bg-accent',
                'data-[highlighted]:bg-accent',
            );
            expect(option).not.toHaveClass('cursor-default');
        }

        await user.hover(inactiveOption);
        expect(inactiveOption).toHaveAttribute('data-highlighted', '');
    });
});

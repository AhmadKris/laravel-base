import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { ConfirmDialog } from './ConfirmDialog';

function renderDialog(overrides: { isPending?: boolean } = {}) {
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();

    render(
        <ConfirmDialog
            open
            onOpenChange={onOpenChange}
            title="Hapus departemen Finance?"
            description="Departemen Finance akan dihapus."
            confirmLabel="Hapus departemen"
            onConfirm={onConfirm}
            {...overrides}
        />,
    );

    return { onConfirm, onOpenChange };
}

it('names the affected object', () => {
    renderDialog();

    expect(
        screen.getByRole('alertdialog', { name: 'Hapus departemen Finance?' }),
    ).toHaveAccessibleDescription('Departemen Finance akan dihapus.');
});

it('confirms without closing so a failed request can be retried', async () => {
    const user = userEvent.setup();
    const { onConfirm, onOpenChange } = renderDialog();

    await user.click(screen.getByRole('button', { name: 'Hapus departemen' }));

    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onOpenChange).not.toHaveBeenCalled();
});

it('focuses a button when opened and closes with the keyboard', async () => {
    const user = userEvent.setup();
    const { onConfirm, onOpenChange } = renderDialog();

    await waitFor(() => expect(screen.getByRole('button', { name: 'Batal' })).toHaveFocus());

    await user.keyboard('{Escape}');

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onConfirm).not.toHaveBeenCalled();
});

it('blocks both actions while the request is running', () => {
    renderDialog({ isPending: true });

    expect(screen.getByRole('button', { name: 'Hapus departemen' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Batal' })).toBeDisabled();
});

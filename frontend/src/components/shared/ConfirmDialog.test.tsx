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
            title="Hapus pengguna Ani?"
            description="Pengguna Ani akan dihapus."
            confirmLabel="Hapus pengguna"
            onConfirm={onConfirm}
            {...overrides}
        />,
    );

    return { onConfirm, onOpenChange };
}

it('names the affected object', () => {
    renderDialog();

    expect(
        screen.getByRole('alertdialog', { name: 'Hapus pengguna Ani?' }),
    ).toHaveAccessibleDescription('Pengguna Ani akan dihapus.');
});

it('confirms without closing so a failed request can be retried', async () => {
    const user = userEvent.setup();
    const { onConfirm, onOpenChange } = renderDialog();

    await user.click(screen.getByRole('button', { name: 'Hapus pengguna' }));

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

    const confirm = screen.getByRole('button', { name: 'Hapus pengguna' });
    expect(confirm).toBeDisabled();
    expect(confirm).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: 'Batal' })).toBeDisabled();
});

it('stays open on Escape while the request is running', async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog({ isPending: true });

    await user.keyboard('{Escape}');

    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog')).toBeVisible();
});

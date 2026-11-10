import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { afterEach, expect, it, vi } from 'vitest';
import { Toaster } from '@/components/ui/sonner';
import { CopyButton } from './CopyButton';

afterEach(() => {
    toast.dismiss();
    vi.restoreAllMocks();
});

it('copies the value to the clipboard and confirms it', async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);

    render(<CopyButton value="budi@example.com" label="Salin email" />);
    await user.click(screen.getByRole('button', { name: 'Salin email' }));

    expect(writeText).toHaveBeenCalledWith('budi@example.com');
    expect(await screen.findByRole('button', { name: 'Tersalin' })).toBeVisible();
});

it('reports an error when writing to the clipboard fails', async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('Denied'));

    render(
        <>
            <Toaster />
            <CopyButton value="req-123" label="Salin ID permintaan" />
        </>,
    );
    await user.click(screen.getByRole('button', { name: 'Salin ID permintaan' }));

    expect(await screen.findByText('Tidak dapat menyalin teks ke clipboard.')).toBeVisible();
});

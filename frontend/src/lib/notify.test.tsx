import { render, screen, within } from '@testing-library/react';
import { toast } from 'sonner';
import { afterEach, expect, it } from 'vitest';
import { Toaster } from '@/components/ui/sonner';
import { ApiError } from './api-error';
import { notifyError } from './notify';

// Sonner keeps its toasts in a module-level store that outlives each render.
afterEach(() => {
    toast.dismiss();
});

async function shownToast(message: string): Promise<HTMLElement> {
    return (await screen.findByText(message)).closest('[data-sonner-toast]') as HTMLElement;
}

it('shows the request code for a server failure so support can find it', async () => {
    render(<Toaster />);

    notifyError(
        new ApiError({ status: 500, code: 'SYSTEM_INTERNAL_ERROR', requestId: 'req-7f3a' }),
    );

    const item = await shownToast('Terjadi gangguan pada server. Coba lagi beberapa saat.');
    expect(within(item).getByText('Kode permintaan: req-7f3a')).toBeVisible();
    expect(item).toHaveAttribute('data-type', 'error');
});

it('leaves out the request code when the user can fix the problem', async () => {
    render(<Toaster />);

    notifyError(new ApiError({ status: 409, code: 'ROLE_IN_USE', requestId: 'req-1b2c' }));

    const item = await shownToast('Role masih dipakai oleh pengguna.');
    expect(within(item).queryByText(/Kode permintaan/)).not.toBeInTheDocument();
});

it('offers a labelled close button', async () => {
    render(<Toaster />);

    notifyError(new ApiError({ status: 422, code: 'VALIDATION_FAILED' }));

    const item = await shownToast('Periksa kembali data yang Anda isi.');
    expect(within(item).getByRole('button', { name: 'Tutup notifikasi' })).toBeInTheDocument();
});

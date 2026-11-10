import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { useForm } from 'react-hook-form';
import { beforeEach, expect, it } from 'vitest';
import { apiClient } from '@/lib/api-client';
import { applyFieldErrors } from '@/lib/form-errors';
import { server } from '@/test/server';
import { FormField } from './FormField';

function SampleForm() {
    const { control, handleSubmit, setError } = useForm({
        defaultValues: { name: '', email: '' },
    });

    const submit = handleSubmit(async (values) => {
        await apiClient.post('/sample', values).catch((error: unknown) => {
            applyFieldErrors(error, setError);
        });
    });

    return (
        <form onSubmit={submit}>
            <FormField
                control={control}
                name="name"
                label="Nama"
                description="Nama lengkap"
                required
            />
            <FormField control={control} name="email" label="Email" type="email" />
            <button type="submit">Simpan</button>
        </form>
    );
}

beforeEach(() => {
    document.cookie = 'XSRF-TOKEN=existing; path=/';
});

it('connects the label and description to the input and exposes required semantics', () => {
    render(<SampleForm />);

    const input = screen.getByLabelText('Nama');

    expect(input).toHaveAccessibleDescription('Nama lengkap');
    expect(input).toHaveAttribute('aria-required', 'true');
    expect(input).not.toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Email')).not.toHaveAttribute('aria-required');
});

it('shows server validation errors on the matching field and focuses it', async () => {
    server.use(
        http.post('*/api/v1/sample', () =>
            HttpResponse.json(
                { code: 'VALIDATION_FAILED', errors: { email: ['Email sudah dipakai.'] } },
                { status: 422 },
            ),
        ),
    );
    const user = userEvent.setup();
    render(<SampleForm />);

    await user.click(screen.getByRole('button', { name: 'Simpan' }));

    const email = await screen.findByLabelText('Email');

    expect(await screen.findByText('Email sudah dipakai.')).toBeVisible();
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(email).toHaveAccessibleDescription('Email sudah dipakai.');
    expect(email).toHaveFocus();
    expect(screen.getByLabelText('Nama')).not.toHaveAttribute('aria-invalid', 'true');
});

it('does not touch fields for other errors', async () => {
    server.use(
        http.post('*/api/v1/sample', () =>
            HttpResponse.json({ code: 'AUTH_FORBIDDEN' }, { status: 403 }),
        ),
    );
    const user = userEvent.setup();
    render(<SampleForm />);

    await user.click(screen.getByRole('button', { name: 'Simpan' }));
    await screen.findByRole('button', { name: 'Simpan' });

    expect(screen.getByLabelText('Email')).not.toHaveAttribute('aria-invalid', 'true');
});

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { expect, it } from 'vitest';
import { PasswordField } from './PasswordField';

function PasswordForm() {
    const form = useForm({ defaultValues: { password: 'rahasia' } });

    return (
        <form>
            <PasswordField
                control={form.control}
                name="password"
                label="Password"
                autoComplete="current-password"
            />
        </form>
    );
}

it('hides the password until the user asks to see it', async () => {
    const user = userEvent.setup();
    render(<PasswordForm />);
    const input = screen.getByLabelText('Password');

    expect(input).toHaveAttribute('type', 'password');
    expect(input).toHaveAttribute('autocomplete', 'current-password');

    await user.click(screen.getByRole('button', { name: 'Tampilkan password' }));

    expect(input).toHaveAttribute('type', 'text');
    expect(input).toHaveValue('rahasia');

    await user.click(screen.getByRole('button', { name: 'Sembunyikan password' }));

    expect(input).toHaveAttribute('type', 'password');
});

it('does not submit the form when toggled', () => {
    render(<PasswordForm />);

    expect(screen.getByRole('button', { name: 'Tampilkan password' })).toHaveAttribute(
        'type',
        'button',
    );
});

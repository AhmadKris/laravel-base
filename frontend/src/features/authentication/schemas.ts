import { z } from 'zod';

const emailField = z.email('Masukkan alamat email yang valid.');

const newPasswordFields = {
    password: z.string().min(12, 'Password minimal 12 karakter.'),
    password_confirmation: z.string().min(1, 'Ulangi password baru.'),
};

const passwordsMatch = {
    check: (values: { password: string; password_confirmation: string }) =>
        values.password === values.password_confirmation,
    issue: { path: ['password_confirmation'], message: 'Konfirmasi password tidak sama.' },
};

export const loginSchema = z.object({
    identifier: z.string().trim().min(1, 'Email atau username wajib diisi.'),
    password: z.string().min(1, 'Password wajib diisi.'),
    remember: z.boolean(),
});

export const forgotPasswordSchema = z.object({ email: emailField });

export const resetPasswordSchema = z
    .object(newPasswordFields)
    .refine(passwordsMatch.check, passwordsMatch.issue);

export const changePasswordSchema = z
    .object({
        current_password: z.string().min(1, 'Password saat ini wajib diisi.'),
        ...newPasswordFields,
    })
    .refine(passwordsMatch.check, passwordsMatch.issue);

export type LoginValues = z.infer<typeof loginSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

export const NEW_PASSWORD_HINT = 'Minimal 12 karakter dan belum pernah muncul di kebocoran data.';

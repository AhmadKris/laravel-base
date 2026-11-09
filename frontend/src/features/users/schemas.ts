import { z } from 'zod';

const USERNAME_PATTERN = /^[a-zA-Z0-9._-]*$/;

export function userFormSchema(requiresPassword: boolean) {
    return z.object({
        name: z.string().trim().min(1, 'Nama wajib diisi.').max(150, 'Nama maksimal 150 karakter.'),
        email: z
            .email('Masukkan alamat email yang valid.')
            .max(255, 'Email maksimal 255 karakter.'),
        username: z
            .string()
            .trim()
            .max(50, 'Username maksimal 50 karakter.')
            .regex(
                USERNAME_PATTERN,
                'Username hanya boleh berisi huruf, angka, titik, garis bawah, dan tanda hubung.',
            )
            .refine((value) => value === '' || value.length >= 3, 'Username minimal 3 karakter.'),
        password: requiresPassword
            ? z.string().min(12, 'Password minimal 12 karakter.')
            : z.string(),
        roles: z.array(z.string()),
    });
}

export type UserFormValues = z.infer<ReturnType<typeof userFormSchema>>;

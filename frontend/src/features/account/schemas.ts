import { z } from 'zod';

export const profileSchema = z.object({
    name: z.string().trim().min(1, 'Nama wajib diisi.').max(150, 'Nama maksimal 150 karakter.'),
    phone: z
        .string()
        .trim()
        .max(30, 'Telepon maksimal 30 karakter.')
        .refine(
            (value) => value === '' || /^\+?[0-9][0-9 ().-]{4,29}$/.test(value),
            'Telepon hanya boleh berisi angka, spasi, tanda kurung, titik, tanda hubung, dan + di awal.',
        ),
});

export const emailChangeSchema = z.object({
    email: z.email('Masukkan alamat email yang valid.'),
    current_password: z.string().min(1, 'Password saat ini wajib diisi.'),
});

export type ProfileValues = z.infer<typeof profileSchema>;
export type EmailChangeValues = z.infer<typeof emailChangeSchema>;

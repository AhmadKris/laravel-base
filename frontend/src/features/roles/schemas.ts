import { z } from 'zod';

export const roleSchema = z.object({
    name: z.string().trim().min(1, 'Nama wajib diisi.').max(150, 'Nama maksimal 150 karakter.'),
    permissions: z.array(z.string()),
});

export type RoleFormValues = z.infer<typeof roleSchema>;

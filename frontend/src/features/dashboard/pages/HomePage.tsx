import { useAuthStore } from '@/stores/auth-store';

export function HomePage() {
    const user = useAuthStore((state) => state.user);

    return (
        <section className="flex flex-col gap-4">
            <h1 className="text-xl font-semibold">Beranda</h1>
            <dl className="grid max-w-xl grid-cols-[8rem_1fr] gap-y-2 text-sm">
                <dt className="text-muted-foreground">Nama</dt>
                <dd>{user?.name}</dd>
                <dt className="text-muted-foreground">Email</dt>
                <dd className="break-all">{user?.email}</dd>
                <dt className="text-muted-foreground">Departemen</dt>
                <dd>{user?.department?.name ?? 'Belum ditetapkan'}</dd>
                <dt className="text-muted-foreground">Role</dt>
                <dd>{user?.roles.join(', ') || 'Belum ditetapkan'}</dd>
            </dl>
        </section>
    );
}

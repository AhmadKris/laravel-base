import { Suspense } from 'react';
import { Outlet } from 'react-router';
import { AppBrand } from '@/components/shared/AppBrand';
import { FormSkeleton } from '@/components/shared/skeletons';

export function AuthLayout() {
    return (
        <div className="grid min-h-svh lg:grid-cols-2">
            <aside className="hidden flex-col justify-between bg-brand p-10 text-brand-foreground lg:flex">
                <div className="flex items-center gap-2.5">
                    <AppBrand surface="dark" markClassName="bg-brand-foreground text-brand" />
                </div>
                <div className="flex max-w-md flex-col gap-3">
                    <p className="text-3xl font-semibold tracking-tight">
                        Pengguna, role, dan akses perusahaan dalam satu tempat.
                    </p>
                    <p className="text-sm text-brand-muted">
                        Akses hanya untuk akun yang diberikan administrator perusahaan.
                    </p>
                </div>
            </aside>
            <main
                id="main-content"
                tabIndex={-1}
                className="flex items-center justify-center bg-card p-4 outline-none"
            >
                <div className="flex w-full max-w-sm flex-col gap-5">
                    <div className="flex items-center gap-2.5 lg:hidden">
                        <AppBrand markClassName="bg-primary text-primary-foreground" />
                    </div>
                    <Suspense fallback={<FormSkeleton label="Memuat halaman" />}>
                        <Outlet />
                    </Suspense>
                </div>
            </main>
        </div>
    );
}

import { Suspense } from 'react';
import { Outlet } from 'react-router';
import { AppLogo } from '@/components/shared/AppLogo';
import { FormSkeleton } from '@/components/shared/skeletons';
import { APP_NAME } from '@/lib/app-name';

export function AuthLayout() {
    return (
        <div className="grid min-h-svh lg:grid-cols-2">
            <aside className="hidden flex-col justify-between bg-brand p-10 text-brand-foreground lg:flex">
                <div className="flex items-center gap-2.5">
                    <AppLogo className="bg-brand-foreground text-brand" />
                    <span className="font-semibold">{APP_NAME}</span>
                </div>
                <div className="flex max-w-md flex-col gap-3">
                    <p className="text-3xl font-semibold tracking-tight">
                        Pengguna, departemen, dan akses perusahaan dalam satu tempat.
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
                        <AppLogo className="bg-primary text-primary-foreground" />
                        <span className="font-semibold">{APP_NAME}</span>
                    </div>
                    <Suspense fallback={<FormSkeleton label="Memuat halaman" />}>
                        <Outlet />
                    </Suspense>
                </div>
            </main>
        </div>
    );
}

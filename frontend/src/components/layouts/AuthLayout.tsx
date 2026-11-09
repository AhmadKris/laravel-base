import { Suspense } from 'react';
import { Outlet } from 'react-router';
import { LoadingState } from '@/components/shared/LoadingState';

export function AuthLayout() {
    return (
        <main className="flex min-h-svh items-center justify-center p-4">
            <div className="flex w-full max-w-sm flex-col gap-4">
                <p className="text-sm font-semibold">Enterprise System</p>
                <Suspense fallback={<LoadingState label="Memuat halaman" />}>
                    <Outlet />
                </Suspense>
            </div>
        </main>
    );
}

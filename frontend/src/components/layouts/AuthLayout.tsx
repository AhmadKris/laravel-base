import { Building2, type LucideIcon, ScrollText, ShieldCheck } from 'lucide-react';
import { Suspense } from 'react';
import { Outlet } from 'react-router';
import { AppBrand } from '@/components/shared/AppBrand';
import { Copyright } from '@/components/shared/Copyright';
import { FormSkeleton } from '@/components/shared/skeletons';
import { Card } from '@/components/ui/card';

interface Highlight {
    icon: LucideIcon;
    title: string;
    description: string;
}

// Each point describes a feature the application actually has.
const HIGHLIGHTS: Highlight[] = [
    {
        icon: ShieldCheck,
        title: 'Akses sesuai role',
        description: 'Menu dan data mengikuti role dan permission akun Anda.',
    },
    {
        icon: ScrollText,
        title: 'Tercatat di audit log',
        description: 'Perubahan penting tercatat beserta pelaku dan waktunya.',
    },
    {
        icon: Building2,
        title: 'Diatur perusahaan',
        description: 'Data perusahaan, logo, dan zona waktu dikelola administrator.',
    },
];

export function AuthLayout() {
    return (
        <div className="grid min-h-svh lg:grid-cols-2">
            <aside className="hidden flex-col justify-between gap-10 bg-brand p-10 text-brand-foreground lg:flex xl:p-14">
                <div className="flex items-center gap-2.5">
                    <AppBrand surface="dark" markClassName="bg-brand-foreground text-brand" />
                </div>
                <div className="flex max-w-xl flex-col gap-10">
                    <div className="grid gap-4">
                        <p className="text-4xl leading-tight font-semibold tracking-tight">
                            Kelola pengguna, role, dan akses perusahaan di{' '}
                            <span className="text-brand-accent">satu tempat</span>.
                        </p>
                        <p className="text-base text-brand-muted">
                            Akses hanya untuk akun yang diberikan administrator perusahaan.
                        </p>
                    </div>
                    <ul className="grid gap-6 xl:grid-cols-3">
                        {HIGHLIGHTS.map(({ icon: Icon, title, description }) => (
                            <li key={title} className="flex gap-3">
                                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-foreground/10 text-brand-accent">
                                    <Icon aria-hidden="true" className="size-5" />
                                </span>
                                <div className="grid gap-0.5">
                                    <p className="text-sm font-semibold">{title}</p>
                                    <p className="text-sm text-brand-muted">{description}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
                <Copyright className="text-xs text-brand-muted" />
            </aside>
            <main
                id="main-content"
                tabIndex={-1}
                className="flex flex-col items-center justify-center gap-6 bg-background p-4 outline-none sm:p-8"
            >
                <Card className="w-full max-w-md gap-6 px-6 py-8 sm:px-8">
                    <div className="flex items-center gap-2.5 lg:hidden">
                        <AppBrand markClassName="bg-primary text-primary-foreground" />
                    </div>
                    <Suspense fallback={<FormSkeleton label="Memuat halaman" />}>
                        <Outlet />
                    </Suspense>
                </Card>
                <Copyright className="text-xs text-muted-foreground lg:hidden" />
            </main>
        </div>
    );
}

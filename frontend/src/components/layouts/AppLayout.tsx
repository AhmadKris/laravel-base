import { type ReactNode, Suspense } from 'react';
import { Outlet } from 'react-router';
import { AppBrand } from '@/components/shared/AppBrand';
import { PageSkeleton } from '@/components/shared/skeletons';
import {
    Sidebar,
    SidebarContent,
    SidebarHeader,
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from '@/components/ui/sidebar';
import { MainNavigation } from './MainNavigation';
import { UserMenu } from './UserMenu';

interface AppLayoutProps {
    children?: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
    return (
        // SidebarProvider writes this cookie but cannot read it without a server render.
        <SidebarProvider defaultOpen={!document.cookie.includes('sidebar_state=false')}>
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-background focus:p-2"
            >
                Lewati ke konten utama
            </a>
            <Sidebar collapsible="icon">
                <SidebarHeader className="h-14 flex-row items-center gap-2.5 px-3 text-sm font-semibold">
                    <AppBrand
                        markClassName="bg-primary text-primary-foreground"
                        nameClassName="group-data-[collapsible=icon]:hidden"
                        logoClassName="group-data-[collapsible=icon]:max-w-8"
                    />
                </SidebarHeader>
                <SidebarContent>
                    <MainNavigation />
                </SidebarContent>
            </Sidebar>
            <SidebarInset className="min-w-0">
                <header className="flex h-14 items-center justify-between border-b bg-card px-3 md:px-4">
                    <SidebarTrigger aria-label="Buka atau tutup menu" />
                    <UserMenu />
                </header>
                <div id="main-content" tabIndex={-1} className="flex-1 p-4 outline-none md:p-6">
                    <Suspense fallback={<PageSkeleton label="Memuat halaman" />}>
                        {children ?? <Outlet />}
                    </Suspense>
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}

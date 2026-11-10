import { type ReactNode, Suspense } from 'react';
import { Outlet } from 'react-router';
import { AppBrand } from '@/components/shared/AppBrand';
import { Copyright } from '@/components/shared/Copyright';
import { HeaderBreadcrumb } from './HeaderBreadcrumb';
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
                {/* Stays at the top while the page scrolls, so the menu and account actions are always reachable. */}
                <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-card px-3 md:px-4">
                    <div className="flex min-w-0 items-center gap-2">
                        <SidebarTrigger aria-label="Buka atau tutup menu" />
                        <HeaderBreadcrumb />
                    </div>
                    <UserMenu />
                </header>
                <div id="main-content" tabIndex={-1} className="flex-1 p-4 outline-none md:p-6">
                    <Suspense fallback={<PageSkeleton label="Memuat halaman" />}>
                        {children ?? <Outlet />}
                    </Suspense>
                </div>
                <footer className="border-t px-4 py-3 md:px-6">
                    <Copyright className="text-xs text-muted-foreground" />
                </footer>
            </SidebarInset>
        </SidebarProvider>
    );
}

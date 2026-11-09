import { NavLink, Outlet, useLocation } from 'react-router';
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarHeader,
    SidebarInset,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    SidebarTrigger,
} from '@/components/ui/sidebar';
import { usePermission } from '@/hooks/usePermission';
import { navigationItems } from './navigation';
import { UserMenu } from './UserMenu';

export function AppLayout() {
    const { can } = usePermission();
    const { pathname } = useLocation();

    const visibleItems = navigationItems.filter(
        (item) => item.permission === undefined || can(item.permission),
    );

    return (
        <SidebarProvider>
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-background focus:p-2"
            >
                Lewati ke konten utama
            </a>
            <Sidebar>
                <SidebarHeader className="px-4 py-3 text-sm font-semibold">
                    Enterprise System
                </SidebarHeader>
                <SidebarContent>
                    <SidebarGroup>
                        <SidebarGroupContent>
                            <SidebarMenu aria-label="Menu utama">
                                {visibleItems.map((item) => (
                                    <SidebarMenuItem key={item.to}>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={
                                                item.to === '/'
                                                    ? pathname === '/'
                                                    : pathname.startsWith(item.to)
                                            }
                                        >
                                            <NavLink to={item.to} end={item.to === '/'}>
                                                <item.icon aria-hidden="true" />
                                                <span>{item.label}</span>
                                            </NavLink>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                </SidebarContent>
            </Sidebar>
            <SidebarInset>
                <header className="flex h-12 items-center justify-between border-b px-3">
                    <SidebarTrigger aria-label="Buka atau tutup menu" />
                    <UserMenu />
                </header>
                <div id="main-content" tabIndex={-1} className="flex-1 p-4 outline-none">
                    <Outlet />
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}

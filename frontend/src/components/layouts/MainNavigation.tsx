import { NavLink, useLocation } from 'react-router';
import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { usePermission } from '@/hooks/usePermission';
import { navigationSections } from './navigation';

export function MainNavigation() {
    const { can } = usePermission();
    const { pathname } = useLocation();
    const { setOpenMobile } = useSidebar();

    const visibleSections = navigationSections
        .map((section) => ({
            ...section,
            items: section.items.filter(
                (item) => item.permission === undefined || can(item.permission),
            ),
        }))
        .filter((section) => section.items.length > 0);

    return (
        <nav aria-label="Menu utama">
            {visibleSections.map((section) => (
                <SidebarGroup key={section.items[0].to}>
                    {section.label !== undefined && (
                        <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
                    )}
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {section.items.map((item) => (
                                <SidebarMenuItem key={item.to}>
                                    <SidebarMenuButton
                                        asChild
                                        tooltip={item.label}
                                        isActive={
                                            item.to === '/'
                                                ? pathname === '/'
                                                : pathname.startsWith(item.to)
                                        }
                                    >
                                        <NavLink
                                            to={item.to}
                                            end={item.to === '/'}
                                            onClick={() => setOpenMobile(false)}
                                        >
                                            <item.icon aria-hidden="true" />
                                            <span>{item.label}</span>
                                        </NavLink>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            ))}
        </nav>
    );
}

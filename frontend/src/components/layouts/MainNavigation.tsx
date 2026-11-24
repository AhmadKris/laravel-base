import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { NavLink, useLocation } from 'react-router';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSkeleton,
    useSidebar,
} from '@/components/ui/sidebar';
import { useNavigation } from '@/features/navigation/hooks/useNavigation';
import { readCollapsedSections, saveCollapsedSections } from '@/lib/sidebar-state';
import type { MenuSection } from '@/types/api-response';
import { NavigationIcon } from './navigationIcons';

interface NavigationItem {
    key: string;
    label: string;
    to: string;
    icon: string;
}

// Home is always reachable and always first, so it is not part of the arranged menu.
const HOME_ITEM: NavigationItem = { key: 'home', label: 'Beranda', to: '/', icon: 'house' };

function toItems(section: MenuSection): NavigationItem[] {
    return section.items.map((item) => ({
        key: item.key,
        label: item.label,
        to: item.path,
        icon: item.icon,
    }));
}

function isItemActive(to: string, pathname: string): boolean {
    return to === '/' ? pathname === '/' : pathname.startsWith(to);
}

function SectionMenu({
    items,
    pathname,
    onNavigate,
}: {
    items: NavigationItem[];
    pathname: string;
    onNavigate: () => void;
}) {
    return (
        <SidebarGroupContent>
            <SidebarMenu>
                {items.map((item) => (
                    <SidebarMenuItem key={item.key}>
                        <SidebarMenuButton
                            asChild
                            tooltip={item.label}
                            isActive={isItemActive(item.to, pathname)}
                        >
                            <NavLink to={item.to} end={item.to === '/'} onClick={onNavigate}>
                                <NavigationIcon name={item.icon} />
                                <span>{item.label}</span>
                            </NavLink>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                ))}
            </SidebarMenu>
        </SidebarGroupContent>
    );
}

export function MainNavigation() {
    const navigation = useNavigation();
    const { pathname } = useLocation();
    const { state, isMobile, setOpenMobile } = useSidebar();
    const isIconCollapsed = state === 'collapsed' && !isMobile;

    const visibleSections = (navigation.data?.sections ?? []).map((section) => ({
        key: section.key,
        label: section.label,
        items: toItems(section),
    }));

    const activeSection = visibleSections.find((section) =>
        section.items.some((item) => isItemActive(item.to, pathname)),
    );
    const activeItem = activeSection?.items.find((item) => isItemActive(item.to, pathname));
    const activeKey = activeSection?.key;
    const activeTarget = activeKey && activeItem ? `${activeKey}:${activeItem.to}` : undefined;

    const [collapsedSections, setCollapsedSections] = useState<string[]>(() => {
        const stored = readCollapsedSections();

        return activeKey === undefined ? stored : stored.filter((id) => id !== activeKey);
    });
    const [prevActiveTarget, setPrevActiveTarget] = useState(activeTarget);

    if (activeTarget !== prevActiveTarget) {
        setPrevActiveTarget(activeTarget);

        if (activeKey !== undefined && collapsedSections.includes(activeKey)) {
            setCollapsedSections(collapsedSections.filter((id) => id !== activeKey));
        }
    }

    useEffect(() => {
        saveCollapsedSections(collapsedSections);
    }, [collapsedSections]);

    const changeSectionOpen = (id: string, open: boolean) => {
        setCollapsedSections((current) =>
            open ? current.filter((item) => item !== id) : [...new Set([...current, id])],
        );
    };

    const closeMobile = () => setOpenMobile(false);

    return (
        <nav aria-label="Menu utama">
            <SidebarGroup>
                <SectionMenu items={[HOME_ITEM]} pathname={pathname} onNavigate={closeMobile} />
            </SidebarGroup>
            {navigation.isPending && (
                <SidebarGroup role="status" aria-label="Memuat menu">
                    {[0, 1, 2].map((row) => (
                        <SidebarMenuSkeleton key={row} showIcon />
                    ))}
                </SidebarGroup>
            )}
            {navigation.isError && (
                <SidebarGroup className="gap-1 group-data-[collapsible=icon]:hidden">
                    <p className="px-2 text-xs text-muted-foreground">Menu tidak dapat dimuat.</p>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="justify-start"
                        onClick={() => void navigation.refetch()}
                    >
                        Muat ulang menu
                    </Button>
                </SidebarGroup>
            )}
            {visibleSections.map((section) => {
                const key = section.key;
                const menu = (
                    <SectionMenu
                        items={section.items}
                        pathname={pathname}
                        onNavigate={closeMobile}
                    />
                );

                if (section.label === null) {
                    return <SidebarGroup key={key}>{menu}</SidebarGroup>;
                }

                // Icon mode hides section headings, so items stay accessible until the sidebar expands again.
                const isOpen = isIconCollapsed || !collapsedSections.includes(key);

                return (
                    <Collapsible
                        key={key}
                        open={isOpen}
                        onOpenChange={(open) => {
                            if (!isIconCollapsed) {
                                changeSectionOpen(key, open);
                            }
                        }}
                        className="group/collapsible"
                    >
                        <SidebarGroup>
                            <SidebarGroupLabel
                                asChild
                                className="w-full cursor-pointer justify-between hover:bg-sidebar-accent/50 hover:text-sidebar-foreground group-data-[collapsible=icon]:pointer-events-none"
                            >
                                <CollapsibleTrigger
                                    tabIndex={isIconCollapsed ? -1 : undefined}
                                    aria-hidden={isIconCollapsed || undefined}
                                >
                                    <span>{section.label}</span>
                                    <ChevronDown
                                        aria-hidden="true"
                                        className="-rotate-90 transition-transform duration-150 group-data-[state=open]/collapsible:rotate-0"
                                    />
                                </CollapsibleTrigger>
                            </SidebarGroupLabel>
                            <CollapsibleContent>{menu}</CollapsibleContent>
                        </SidebarGroup>
                    </Collapsible>
                );
            })}
        </nav>
    );
}

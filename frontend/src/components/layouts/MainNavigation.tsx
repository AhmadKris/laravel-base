import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { NavLink, useLocation } from 'react-router';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
import { readCollapsedSections, saveCollapsedSections } from '@/lib/sidebar-state';
import { type NavigationItem, type NavigationSection, navigationSections } from './navigation';

function isItemActive(to: string, pathname: string): boolean {
    return to === '/' ? pathname === '/' : pathname.startsWith(to);
}

function sectionKey(section: NavigationSection): string {
    return section.id ?? section.items[0].to;
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
                    <SidebarMenuItem key={item.to}>
                        <SidebarMenuButton
                            asChild
                            tooltip={item.label}
                            isActive={isItemActive(item.to, pathname)}
                        >
                            <NavLink to={item.to} end={item.to === '/'} onClick={onNavigate}>
                                <item.icon aria-hidden="true" />
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
    const { can } = usePermission();
    const { pathname } = useLocation();
    const { state, isMobile, setOpenMobile } = useSidebar();
    const isIconCollapsed = state === 'collapsed' && !isMobile;

    const visibleSections = navigationSections
        .map((section) => ({
            ...section,
            items: section.items.filter(
                (item) => item.permission === undefined || can(item.permission),
            ),
        }))
        .filter((section) => section.items.length > 0);

    const activeSection = visibleSections.find(
        (section) =>
            section.label !== undefined &&
            section.items.some((item) => isItemActive(item.to, pathname)),
    );
    const activeItem = activeSection?.items.find((item) => isItemActive(item.to, pathname));
    const activeKey = activeSection ? sectionKey(activeSection) : undefined;
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
            {visibleSections.map((section) => {
                const key = sectionKey(section);
                const menu = (
                    <SectionMenu
                        items={section.items}
                        pathname={pathname}
                        onNavigate={closeMobile}
                    />
                );

                if (section.label === undefined) {
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

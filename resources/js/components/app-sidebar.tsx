import { Link, usePage } from '@inertiajs/react';
import { Activity, BookOpen, CalendarDays, ChevronDown, FileText, Flag, Folder, FolderGit2, Inbox, Landmark, LayoutGrid, Megaphone, Receipt, ScrollText, Shield, type LucideIcon, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import AppLogoIcon from '@/components/app-logo-icon';
import { NavFooter } from '@/components/nav-footer';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import web from '@/routes/web';

interface SidebarNavItem {
    title: string;
    href: string;
    icon: LucideIcon;
}

interface SidebarNavGroup {
    label: string;
    defaultOpen?: boolean;
    items: SidebarNavItem[];
    roles?: string[];
}

interface SidebarPageProps extends Record<string, unknown> {
    auth?: {
        user?: {
            roles?: { name: string }[] | null;
        } | null;
    };
}

const navGroups: SidebarNavGroup[] = [
    {
        label: 'CRM',
        defaultOpen: true,
        items: [
            { title: 'Dashboard', href: web.dashboard().url, icon: LayoutGrid },
            { title: 'Leads', href: web.leads.index().url, icon: FileText },
        ],
    },
    {
        label: 'Operations',
        defaultOpen: true,
        items: [
            { title: 'Projects', href: web.projects.index().url, icon: Folder },
            {
                title: 'Milestones',
                href: web.milestones.index().url,
                icon: Flag,
            },
            {
                title: 'Tenders & RFPs',
                href: web.tenders.index().url,
                icon: ScrollText,
            },
            {
                title: 'Time Logs',
                href: web.timeLogs.index().url,
                icon: Activity,
            },
        ],
    },
    {
        label: 'HR & Team',
        items: [
            { title: 'Human Resources', href: web.hr.index().url, icon: Users },
            { title: 'Employees', href: web.hr.staff.index().url, icon: Users },
            {
                title: 'Leave',
                href: web.hr.leave.index().url,
                icon: CalendarDays,
            },
            { title: 'Payroll', href: web.payroll.index().url, icon: Landmark },
            { title: 'Job Postings', href: web.hr.jobs.index().url, icon: Megaphone },
            { title: 'Applications', href: web.hr.applications.index().url, icon: Inbox },
        ],
    },
    {
        label: 'Finance',
        items: [
            {
                title: 'Invoices',
                href: web.invoices.index().url,
                icon: Receipt,
            },
        ],
    },
    {
        label: 'Administration',
        roles: ['admin', 'human resource'],
        items: [
            {
                title: 'User Management',
                href: web.users.index().url,
                icon: Shield,
            },
        ],
    },
];

const footerNavItems: SidebarNavItem[] = [
    {
        title: 'Repository',
        href: 'https://github.com/laravel/react-starter-kit',
        icon: FolderGit2,
    },
    {
        title: 'Documentation',
        href: 'https://laravel.com/docs/starter-kits#react',
        icon: BookOpen,
    },
];

function normalizePath(path: string): string {
    const pathname = path.split(/[?#]/, 1)[0] || '/';

    return pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
}

function NavGroupSection({
    group,
    currentUrl,
    userRoles,
}: {
    group: SidebarNavGroup;
    currentUrl: string;
    userRoles: string[];
}) {
    const currentPath = normalizePath(currentUrl);
    const isActive = (href: string) => {
        const itemPath = normalizePath(href);

        return (
            currentPath === itemPath || currentPath.startsWith(`${itemPath}/`)
        );
    };
    const hasActiveItem = group.items.some((item) => isActive(item.href));
    const [open, setOpen] = useState(
        Boolean(group.defaultOpen || hasActiveItem),
    );
    const allowedRoles = new Set(userRoles.map((role) => role.toLowerCase()));

    useEffect(() => {
        if (hasActiveItem) {
            setOpen(true);
        }
    }, [currentUrl, hasActiveItem]);

    if (
        group.roles &&
        !group.roles.some((role) => allowedRoles.has(role.toLowerCase()))
    ) {
        return null;
    }

    return (
        <Collapsible open={open} onOpenChange={setOpen}>
            <SidebarGroup className="py-0">
                <SidebarGroupLabel asChild>
                    <CollapsibleTrigger
                        className={cn(
                            'mt-3 flex w-full cursor-pointer items-center justify-between px-3 py-2 select-none',
                            'text-[10px] font-semibold tracking-[0.08em] uppercase',
                            'text-sidebar-foreground/40 transition-colors hover:text-sidebar-foreground/70',
                        )}
                    >
                        {group.label}
                        <ChevronDown
                            className={cn(
                                'h-3 w-3 text-sidebar-foreground/30 transition-transform duration-200',
                                open && 'rotate-180',
                            )}
                        />
                    </CollapsibleTrigger>
                </SidebarGroupLabel>

                <CollapsibleContent>
                    <SidebarGroupContent>
                        <SidebarMenu className="gap-0">
                            {group.items.map((item) => {
                                const active = isActive(item.href);
                                const Icon = item.icon;

                                return (
                                    <SidebarMenuItem key={item.href}>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={active}
                                            className={cn(
                                                'relative h-8 gap-2.5 rounded-md px-3 text-[13px]',
                                                'transition-all duration-150',
                                                'text-sidebar-foreground/70 hover:text-sidebar-accent-foreground',
                                                'hover:bg-sidebar-accent/60',
                                                active && [
                                                    'bg-sidebar-primary/15 font-medium text-sidebar-primary',
                                                    'hover:bg-sidebar-primary/20 hover:text-sidebar-primary',
                                                    'before:absolute before:top-1 before:bottom-1 before:left-0',
                                                    'before:w-0.5 before:rounded-full before:bg-sidebar-primary',
                                                ],
                                            )}
                                        >
                                            <Link
                                                href={item.href}
                                                prefetch
                                                aria-current={
                                                    active ? 'page' : undefined
                                                }
                                            >
                                                <Icon
                                                    className={cn(
                                                        'h-[15px] w-[15px] shrink-0',
                                                        active
                                                            ? 'text-sidebar-primary'
                                                            : 'text-sidebar-foreground/40',
                                                    )}
                                                />
                                                <span>{item.title}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </CollapsibleContent>
            </SidebarGroup>
        </Collapsible>
    );
}

function SidebarLogo() {
    return (
        <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[oklch(0.76_0.176_74)] bg-[oklch(0.18_0.022_255)]">
                <AppLogoIcon className="h-6 w-6 fill-current text-black dark:text-white" />
            </div>
            <div className="leading-tight">
                <p className="text-[13px] font-bold tracking-tight text-sidebar-accent-foreground">
                    Sledeći
                </p>
                <p className="text-[10px] tracking-wide text-sidebar-foreground/40">
                    Sales Cloud
                </p>
            </div>
        </div>
    );
}

export function AppSidebar() {
    const { url, props } = usePage<SidebarPageProps>();
    const userRoles = props.auth?.user?.roles?.map((role) => role.name) ?? [];

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader className="border-b border-sidebar-border/50 pt-3 pb-3">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            size="lg"
                            asChild
                            className="hover:bg-sidebar-accent/50"
                        >
                            <Link href={web.dashboard().url} prefetch>
                                <SidebarLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent className="[scrollbar-width:thin] [scrollbar-color:var(--color-sidebar-border)_transparent] gap-0 overflow-y-auto py-2">
                {navGroups.map((group) => (
                    <NavGroupSection
                        key={group.label}
                        group={group}
                        currentUrl={url}
                        userRoles={userRoles}
                    />
                ))}
            </SidebarContent>

            <SidebarFooter className="border-t border-sidebar-border/50 pt-2">
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}

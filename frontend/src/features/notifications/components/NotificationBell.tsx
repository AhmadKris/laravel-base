import { useQuery } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { ListSkeleton } from '@/components/shared/skeletons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toApiError } from '@/lib/api-error';
import { formatDateTime } from '@/lib/format';
import type { Notification } from '@/types/api-response';
import { categoryMeta } from '../categories';
import {
    isSafeInternalPath,
    useMarkAllNotificationsAsRead,
    useMarkNotificationAsRead,
    useUnreadNotificationCount,
} from '../hooks/useNotifications';
import { notificationKeys, notificationService } from '../services/notificationService';

const POPOVER_LIMIT = 5;
const MAX_BADGE_COUNT = 99;

function formatBadgeCount(count: number): string {
    return count > MAX_BADGE_COUNT ? `${MAX_BADGE_COUNT}+` : String(count);
}

export function NotificationBell() {
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();

    const unreadCountQuery = useUnreadNotificationCount();
    const unreadCount = unreadCountQuery.data?.unread_count ?? 0;

    const recent = useQuery({
        queryKey: notificationKeys.recent,
        queryFn: () => notificationService.list({ page: 1, per_page: POPOVER_LIMIT }),
        enabled: open,
    });

    const markAsRead = useMarkNotificationAsRead();
    const markAll = useMarkAllNotificationsAsRead();

    const handleSelect = (item: Notification) => {
        if (!item.is_read) {
            markAsRead.mutate(item.id);
        }

        setOpen(false);

        if (isSafeInternalPath(item.action_url)) {
            void navigate(item.action_url);
        }
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="relative"
                    aria-label={
                        unreadCount > 0 ? `Notifikasi, ${unreadCount} belum dibaca` : 'Notifikasi'
                    }
                >
                    <Bell aria-hidden="true" />
                    {unreadCount > 0 && (
                        <span
                            aria-hidden="true"
                            className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-xs font-medium text-primary-foreground tabular-nums"
                        >
                            {formatBadgeCount(unreadCount)}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[min(24rem,calc(100vw-2rem))] p-0">
                <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
                    <h2 className="text-sm font-semibold">Notifikasi</h2>
                    {unreadCount > 0 && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            loading={markAll.isPending}
                            onClick={() => markAll.mutate()}
                        >
                            Tandai semua dibaca
                        </Button>
                    )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                    {recent.isPending && (
                        <div className="p-4">
                            <ListSkeleton label="Memuat notifikasi terbaru" rows={3} />
                        </div>
                    )}
                    {recent.isError && (
                        <ErrorState
                            title="Notifikasi tidak dapat dimuat"
                            message={toApiError(recent.error).message}
                            onRetry={() => void recent.refetch()}
                        />
                    )}
                    {recent.isSuccess && recent.data.data.length === 0 && (
                        <EmptyState
                            title="Belum ada notifikasi"
                            description="Pemberitahuan akun dan sistem akan muncul di sini."
                        />
                    )}
                    {recent.isSuccess && recent.data.data.length > 0 && (
                        <ul className="divide-y">
                            {recent.data.data.map((item) => {
                                const category = categoryMeta(item.category);

                                return (
                                    <li key={item.id}>
                                        <button
                                            type="button"
                                            onClick={() => handleSelect(item)}
                                            className="flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex min-w-0 items-center gap-2">
                                                    {!item.is_read && (
                                                        <span
                                                            aria-hidden="true"
                                                            className="size-2 shrink-0 rounded-full bg-primary"
                                                        />
                                                    )}
                                                    <Badge variant={category.variant}>
                                                        {category.label}
                                                    </Badge>
                                                </div>
                                                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                                                    {item.created_at
                                                        ? formatDateTime(item.created_at)
                                                        : '-'}
                                                </span>
                                            </div>
                                            <span
                                                className={
                                                    item.is_read
                                                        ? 'text-sm text-foreground'
                                                        : 'text-sm font-medium text-foreground'
                                                }
                                            >
                                                {item.title}
                                            </span>
                                            <span className="line-clamp-2 text-xs text-muted-foreground">
                                                {item.message}
                                            </span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
                <div className="border-t px-4 py-2.5">
                    <Button asChild variant="ghost" size="sm" className="w-full justify-center">
                        <Link to="/notifications" onClick={() => setOpen(false)}>
                            Lihat semua notifikasi
                        </Link>
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}

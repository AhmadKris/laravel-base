import { Link } from 'react-router';
import type { DataTableColumn } from '@/components/shared/dataTableColumns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/format';
import type { Notification } from '@/types/api-response';
import { categoryMeta } from '../categories';
import { isSafeInternalPath } from '../hooks/useNotifications';

interface ColumnOptions {
    onMarkAsRead: (notification: Notification) => void;
    isPendingId: string | undefined;
}

export function notificationColumns({
    onMarkAsRead,
    isPendingId,
}: ColumnOptions): DataTableColumn<Notification>[] {
    return [
        {
            id: 'title',
            header: 'Notifikasi',
            cell: ({ row }) => {
                const item = row.original;
                const safeUrl = isSafeInternalPath(item.action_url) ? item.action_url : null;

                return (
                    <div className="flex items-start gap-2.5 whitespace-normal">
                        {!item.is_read && (
                            <span
                                aria-hidden="true"
                                className="mt-1.5 size-2 shrink-0 rounded-full bg-primary"
                            />
                        )}
                        <div className="flex min-w-0 flex-col gap-0.5">
                            {safeUrl !== null ? (
                                <Link
                                    to={safeUrl}
                                    onClick={() => {
                                        if (!item.is_read) {
                                            onMarkAsRead(item);
                                        }
                                    }}
                                    className={
                                        item.is_read
                                            ? 'hover:underline'
                                            : 'font-medium hover:underline'
                                    }
                                >
                                    {item.title}
                                </Link>
                            ) : (
                                <span className={item.is_read ? undefined : 'font-medium'}>
                                    {item.title}
                                </span>
                            )}
                            <span className="text-xs text-muted-foreground">{item.message}</span>
                        </div>
                    </div>
                );
            },
        },
        {
            id: 'category',
            header: 'Kategori',
            // Kept on mobile cards and wide screens so tablet tables stay within 768 px.
            meta: { wideScreenOnly: true },
            cell: ({ row }) => {
                const category = categoryMeta(row.original.category);

                return <Badge variant={category.variant}>{category.label}</Badge>;
            },
        },
        {
            id: 'status',
            header: 'Status',
            cell: ({ row }) =>
                row.original.is_read ? (
                    <Badge variant="secondary">Sudah dibaca</Badge>
                ) : (
                    <Badge variant="info">Belum dibaca</Badge>
                ),
        },
        {
            id: 'created_at',
            header: 'Waktu',
            accessorKey: 'created_at',
            enableSorting: true,
            cell: ({ row }) => (
                <span className="whitespace-nowrap tabular-nums">
                    {row.original.created_at ? formatDateTime(row.original.created_at) : '-'}
                </span>
            ),
        },
        {
            id: 'actions',
            header: () => <span className="sr-only">Aksi</span>,
            cell: ({ row }) => {
                if (row.original.is_read) {
                    return null;
                }

                return (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        loading={isPendingId === row.original.id}
                        onClick={() => onMarkAsRead(row.original)}
                    >
                        Tandai dibaca
                    </Button>
                );
            },
        },
    ];
}

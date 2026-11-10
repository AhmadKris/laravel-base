import { Ellipsis } from 'lucide-react';
import { Link } from 'react-router';
import type { DataTableColumn } from '@/components/shared/dataTableColumns';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDateTime } from '@/lib/format';
import type { User } from '@/types/api-response';

interface ColumnOptions {
    currentUserId: string | undefined;
    canUpdate: boolean;
    canDelete: boolean;
    onChangeStatus: (user: User) => void;
}

function canChangeStatus(user: User, options: ColumnOptions): boolean {
    return user.status === 'active'
        ? options.canDelete && user.id !== options.currentUserId
        : options.canUpdate;
}

export function userColumns(options: ColumnOptions): DataTableColumn<User>[] {
    const { canUpdate, canDelete, onChangeStatus } = options;
    const columns: DataTableColumn<User>[] = [
        {
            id: 'name',
            header: 'Nama',
            accessorKey: 'name',
            enableSorting: true,
            cell: ({ row }) => (
                <div className="flex items-center gap-2.5">
                    <UserAvatar name={row.original.name} />
                    <div className="flex min-w-0 flex-col">
                        <Link
                            to={`/users/${row.original.id}`}
                            className="font-medium hover:underline"
                        >
                            {row.original.name}
                        </Link>
                        <span
                            className="max-w-48 truncate text-xs text-muted-foreground"
                            title={row.original.email}
                        >
                            {row.original.email}
                        </span>
                    </div>
                </div>
            ),
        },
        {
            id: 'username',
            header: 'Username',
            cell: ({ row }) => row.original.username ?? '-',
            // Optional and shown on the detail page, so it gives way first on a tablet.
            meta: { wideScreenOnly: true },
        },
        {
            id: 'roles',
            header: 'Role',
            // Several roles wrap instead of widening the table past a tablet screen.
            cell: ({ row }) => (
                <span className="block min-w-24 whitespace-normal">
                    {row.original.roles?.join(', ') || '-'}
                </span>
            ),
        },
        {
            id: 'status',
            header: 'Status',
            cell: ({ row }) => <StatusBadge status={row.original.status} />,
        },
        {
            id: 'created_at',
            header: 'Dibuat',
            accessorKey: 'created_at',
            enableSorting: true,
            cell: ({ row }) =>
                row.original.created_at ? formatDateTime(row.original.created_at) : '-',
        },
    ];

    if (!canUpdate && !canDelete) {
        return columns;
    }

    return [
        ...columns,
        {
            id: 'actions',
            header: () => <span className="sr-only">Aksi</span>,
            cell: ({ row }) => (
                // Not modal: a modal menu would leave the page inert when it opens the status dialog.
                <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Aksi untuk ${row.original.name}`}
                        >
                            <Ellipsis aria-hidden="true" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {canUpdate && (
                            <DropdownMenuItem asChild>
                                <Link to={`/users/${row.original.id}/edit`}>Ubah pengguna</Link>
                            </DropdownMenuItem>
                        )}
                        {canChangeStatus(row.original, options) && (
                            <DropdownMenuItem
                                variant={
                                    row.original.status === 'active' ? 'destructive' : 'default'
                                }
                                onSelect={() => onChangeStatus(row.original)}
                            >
                                {row.original.status === 'active'
                                    ? 'Nonaktifkan pengguna'
                                    : 'Aktifkan pengguna'}
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            ),
        },
    ];
}

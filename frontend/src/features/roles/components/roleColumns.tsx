import { Ellipsis } from 'lucide-react';
import { Link } from 'react-router';
import type { DataTableColumn } from '@/components/shared/dataTableColumns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDateTime } from '@/lib/format';
import type { Role } from '@/types/api-response';
import { SUPER_ADMIN_ROLE } from '../permissionGroups';

interface ColumnOptions {
    canUpdate: boolean;
    canDelete: boolean;
    onDelete: (role: Role) => void;
}

export function roleColumns({
    canUpdate,
    canDelete,
    onDelete,
}: ColumnOptions): DataTableColumn<Role>[] {
    const columns: DataTableColumn<Role>[] = [
        {
            id: 'name',
            header: 'Nama',
            accessorKey: 'name',
            enableSorting: true,
            cell: ({ row }) => (
                <Link to={`/roles/${row.original.id}`} className="font-medium hover:underline">
                    {row.original.name}
                </Link>
            ),
        },
        {
            id: 'type',
            header: 'Jenis',
            cell: ({ row }) =>
                row.original.is_protected ? (
                    <Badge variant="info">Bawaan</Badge>
                ) : (
                    <Badge variant="secondary">Kustom</Badge>
                ),
        },
        {
            id: 'users_count',
            header: 'Jumlah pengguna',
            cell: ({ row }) => (
                <span className="tabular-nums">{row.original.users_count ?? 0}</span>
            ),
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
            cell: ({ row }) => {
                const canEditRow = canUpdate && row.original.name !== SUPER_ADMIN_ROLE;
                const canDeleteRow = canDelete && !row.original.is_protected;

                if (!canEditRow && !canDeleteRow) {
                    return null;
                }

                return (
                    // Not modal: a modal menu would leave the page inert when it opens the delete dialog.
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
                            {canEditRow && (
                                <DropdownMenuItem asChild>
                                    <Link to={`/roles/${row.original.id}/edit`}>Ubah role</Link>
                                </DropdownMenuItem>
                            )}
                            {canDeleteRow && (
                                <DropdownMenuItem
                                    variant="destructive"
                                    onSelect={() => onDelete(row.original)}
                                >
                                    Hapus role
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            },
        },
    ];
}

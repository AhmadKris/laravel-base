import { Link } from 'react-router';
import type { DataTableColumn } from '@/components/shared/dataTableColumns';
import { eventTitle, subjectTypeLabel } from '@/lib/audit-events';
import { formatDateTime } from '@/lib/format';
import type { AuditLog } from '@/types/api-response';

export const auditLogColumns: DataTableColumn<AuditLog>[] = [
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
        id: 'event',
        header: 'Aktivitas',
        cell: ({ row }) => (
            <div className="flex min-w-0 flex-col">
                <Link to={`/audit-logs/${row.original.id}`} className="font-medium hover:underline">
                    {eventTitle(row.original.event_label)}
                </Link>
                <span className="font-mono text-xs text-muted-foreground">
                    {row.original.event}
                </span>
            </div>
        ),
    },
    {
        id: 'actor',
        header: 'Pengguna',
        cell: ({ row }) =>
            row.original.actor === null ? (
                <span className="text-muted-foreground">Tanpa akun</span>
            ) : (
                <div className="flex min-w-0 flex-col">
                    <span>{row.original.actor.name}</span>
                    <span className="text-xs text-muted-foreground">
                        {row.original.actor.email}
                    </span>
                </div>
            ),
    },
    {
        id: 'subject',
        header: 'Objek',
        cell: ({ row }) => {
            const { subject } = row.original;

            if (subject === null) {
                return <span className="text-muted-foreground">-</span>;
            }

            return (
                <div className="flex min-w-0 flex-col">
                    <span>{subject.label ?? 'Sudah dihapus'}</span>
                    <span className="text-xs text-muted-foreground">
                        {subjectTypeLabel(subject.type)}
                    </span>
                </div>
            );
        },
    },
];

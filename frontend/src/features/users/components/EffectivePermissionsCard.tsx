import { useQuery } from '@tanstack/react-query';
import { DetailCard } from '@/components/shared/DetailCard';
import { ErrorState } from '@/components/shared/ErrorState';
import { ListSkeleton } from '@/components/shared/skeletons';
import { groupPermissions } from '@/features/roles/permissionGroups';
import { toApiError } from '@/lib/api-error';
import { userKeys, userService } from '../services/userService';

interface EffectivePermissionsCardProps {
    userId: string;
    hasRoles: boolean;
}

/**
 * What the user can do through all of their roles, with the roles behind each permission.
 */
export function EffectivePermissionsCard({ userId, hasRoles }: EffectivePermissionsCardProps) {
    const query = useQuery({
        queryKey: userKeys.permissions(userId),
        queryFn: () => userService.listPermissions(userId),
        enabled: hasRoles,
    });

    return (
        <DetailCard title="Hak akses efektif">
            {!hasRoles ? (
                <p className="text-sm text-muted-foreground">
                    Pengguna ini belum memiliki role, sehingga tidak memiliki hak akses.
                </p>
            ) : query.isPending ? (
                <ListSkeleton label="Memuat hak akses pengguna" rows={3} />
            ) : query.isError ? (
                <ErrorState
                    title="Hak akses pengguna tidak dapat dimuat"
                    message={toApiError(query.error).message}
                    onRetry={() => void query.refetch()}
                />
            ) : query.data.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                    Role pengguna ini belum memiliki permission.
                </p>
            ) : (
                <dl className="grid gap-x-4 gap-y-3 text-sm sm:grid-cols-[9rem_1fr]">
                    {groupPermissions(query.data).map((group) => (
                        <div key={group.key} className="contents">
                            <dt className="font-medium">{group.label}</dt>
                            <dd>
                                <ul className="grid gap-1">
                                    {group.permissions.map((permission) => (
                                        <li
                                            key={permission.name}
                                            className="flex flex-wrap items-baseline gap-x-2"
                                        >
                                            <span>{permission.label}</span>
                                            <span className="text-xs text-muted-foreground">
                                                dari {permission.granted_by.join(', ')}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </dd>
                        </div>
                    ))}
                </dl>
            )}
        </DetailCard>
    );
}

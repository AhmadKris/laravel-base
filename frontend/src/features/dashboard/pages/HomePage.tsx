import { PageHeader } from '@/components/shared/PageHeader';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePermission } from '@/hooks/usePermission';
import { useAuthStore } from '@/stores/auth-store';
import { RecentActivity } from '../components/RecentActivity';
import { StatTile } from '../components/StatTile';
import { getDashboardStats } from '../stats';

const NOT_ASSIGNED = 'Belum ditetapkan';

export function HomePage() {
    const user = useAuthStore((state) => state.user);
    const { can } = usePermission();
    const visibleStats = getDashboardStats().filter((stat) => can(stat.permission));

    return (
        <section className="flex flex-col gap-5">
            <PageHeader title="Beranda" description="Ringkasan data dan aktivitas terbaru." />
            {visibleStats.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {visibleStats.map((stat) => (
                        <StatTile key={stat.path} {...stat} />
                    ))}
                </div>
            )}
            <div className="grid items-start gap-4 lg:grid-cols-3">
                {can('audit.view') && <RecentActivity />}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-semibold">Akun Anda</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                            <UserAvatar name={user?.name ?? ''} size="lg" />
                            <div className="flex min-w-0 flex-col">
                                <span className="truncate text-sm font-medium">{user?.name}</span>
                                <span className="text-xs break-all text-muted-foreground">
                                    {user?.email}
                                </span>
                            </div>
                        </div>
                        <dl className="grid grid-cols-[6rem_1fr] gap-y-1.5 text-sm">
                            <dt className="text-muted-foreground">Departemen</dt>
                            <dd>{user?.department?.name ?? NOT_ASSIGNED}</dd>
                            <dt className="text-muted-foreground">Role</dt>
                            <dd>{user?.roles.join(', ') || NOT_ASSIGNED}</dd>
                        </dl>
                    </CardContent>
                </Card>
            </div>
        </section>
    );
}

import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { CenteredPage } from '@/components/shared/CenteredPage';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageSkeleton } from '@/components/shared/skeletons';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useNavigation } from '@/features/navigation/hooks/useNavigation';

interface ModuleRouteProps {
    module: string;
    children: ReactNode;
}

/**
 * Shows the page of an optional module only while the module is enabled. If the module state
 * cannot be read, the page still opens and its API answers for the module.
 */
export function ModuleRoute({ module, children }: ModuleRouteProps) {
    const navigation = useNavigation();

    if (navigation.isPending) {
        return <PageSkeleton label="Memuat halaman" />;
    }

    if (navigation.data !== undefined && !navigation.data.modules.includes(module)) {
        return (
            <CenteredPage>
                <Card className="py-0">
                    <EmptyState
                        title="Modul tidak aktif"
                        description="Modul ini sedang dinonaktifkan oleh administrator."
                        action={
                            <Button asChild variant="outline" size="sm">
                                <Link to="/">Kembali ke beranda</Link>
                            </Button>
                        }
                    />
                </Card>
            </CenteredPage>
        );
    }

    return children;
}

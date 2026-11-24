import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router';
import { CenteredPage } from '@/components/shared/CenteredPage';
import { ErrorState } from '@/components/shared/ErrorState';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageSkeleton } from '@/components/shared/skeletons';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChangePasswordForm } from '@/features/authentication/components/ChangePasswordForm';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { toApiError } from '@/lib/api-error';
import { EmailChangeForm } from '../components/EmailChangeForm';
import { ProfileForm } from '../components/ProfileForm';
import { SessionsCard } from '../components/SessionsCard';
import { accountKeys, accountService } from '../services/accountService';

const TABS = [
    { id: 'profile', label: 'Profil' },
    { id: 'security', label: 'Keamanan' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export function AccountPage() {
    const queryClient = useQueryClient();
    const [params, setParams] = useSearchParams();
    const query = useQuery({
        queryKey: accountKeys.account,
        queryFn: accountService.get,
        // A refetch would reset the profile form and discard unsaved edits.
        refetchOnWindowFocus: false,
    });

    // Each form keeps its own state, so their unsaved changes are collected here for one guard.
    const [dirtyForms, setDirtyForms] = useState<ReadonlySet<string>>(() => new Set());
    const markDirty = useCallback((form: string, dirty: boolean) => {
        setDirtyForms((current) => {
            if (current.has(form) === dirty) {
                return current;
            }

            const next = new Set(current);

            if (dirty) {
                next.add(form);
            } else {
                next.delete(form);
            }

            return next;
        });
    }, []);
    const markProfileDirty = useCallback(
        (dirty: boolean) => markDirty('profile', dirty),
        [markDirty],
    );
    const markEmailDirty = useCallback((dirty: boolean) => markDirty('email', dirty), [markDirty]);
    const markPasswordDirty = useCallback(
        (dirty: boolean) => markDirty('password', dirty),
        [markDirty],
    );
    const guard = useUnsavedChangesGuard(dirtyForms.size > 0);

    const requestedTab = params.get('tab');
    const activeTab: TabId = TABS.some((tab) => tab.id === requestedTab)
        ? (requestedTab as TabId)
        : 'profile';

    const header = (
        <PageHeader
            title="Akun saya"
            description="Profil, email login, password, dan perangkat yang masuk ke akun Anda."
        />
    );

    if (query.isPending) {
        return (
            <CenteredPage>
                <PageSkeleton label="Memuat akun" />
            </CenteredPage>
        );
    }

    if (query.isError) {
        return (
            <CenteredPage>
                {header}
                <Card className="py-0">
                    <ErrorState
                        title="Akun tidak dapat dimuat"
                        message={toApiError(query.error).message}
                        onRetry={() => void query.refetch()}
                    />
                </Card>
            </CenteredPage>
        );
    }

    return (
        <CenteredPage>
            {header}
            <Tabs value={activeTab} onValueChange={(tab) => setParams({ tab }, { replace: true })}>
                <TabsList variant="line" aria-label="Bagian akun">
                    {TABS.map((tab) => (
                        <TabsTrigger key={tab.id} value={tab.id}>
                            {tab.label}
                        </TabsTrigger>
                    ))}
                </TabsList>
                <TabsContent value="profile" className="grid gap-4" forceMount>
                    <ProfileForm
                        key={`${query.data.name}|${query.data.phone ?? ''}`}
                        account={query.data}
                        onDirtyChange={markProfileDirty}
                    />
                    <EmailChangeForm account={query.data} onDirtyChange={markEmailDirty} />
                </TabsContent>
                <TabsContent value="security" className="grid gap-4" forceMount>
                    <ChangePasswordForm
                        onDirtyChange={markPasswordDirty}
                        onChanged={() =>
                            void queryClient.invalidateQueries({ queryKey: accountKeys.sessions })
                        }
                    />
                    <SessionsCard />
                </TabsContent>
            </Tabs>
            {guard.dialog}
        </CenteredPage>
    );
}

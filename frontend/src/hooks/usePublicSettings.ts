import { useQuery } from '@tanstack/react-query';
import { APP_NAME } from '@/lib/app-name';
import { publicSettingKeys, publicSettingService } from '@/lib/public-settings';

interface PublicSettings {
    companyName: string;
    timeZone: string | undefined;
}

/**
 * Falls back to the built-in name and the browser time zone while the settings load or when they fail.
 */
export function usePublicSettings(): PublicSettings {
    const { data } = useQuery({
        queryKey: publicSettingKeys.all,
        queryFn: publicSettingService.get,
        staleTime: 5 * 60 * 1000,
    });

    const name = data?.['company.name'];
    const timeZone = data?.['localization.timezone'];

    return {
        companyName: typeof name === 'string' && name.trim() !== '' ? name : APP_NAME,
        timeZone: typeof timeZone === 'string' ? timeZone : undefined,
    };
}

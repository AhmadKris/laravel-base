import type { NotificationCategory } from '@/types/api-response';

export interface NotificationCategoryMeta {
    value: NotificationCategory;
    label: string;
    variant: 'warning' | 'info' | 'outline';
}

export const NOTIFICATION_CATEGORIES: NotificationCategoryMeta[] = [
    { value: 'security', label: 'Keamanan', variant: 'warning' },
    { value: 'user', label: 'Akun', variant: 'info' },
];

const CATEGORY_MAP = new Map<string, NotificationCategoryMeta>(
    NOTIFICATION_CATEGORIES.map((item) => [item.value, item]),
);

export function categoryMeta(category: string): {
    label: string;
    variant: NotificationCategoryMeta['variant'];
} {
    return CATEGORY_MAP.get(category) ?? { label: category, variant: 'outline' };
}

import { usePublicSettings } from '@/hooks/usePublicSettings';

interface CopyrightProps {
    className?: string;
}

export function Copyright({ className }: CopyrightProps) {
    const { companyName } = usePublicSettings();

    return (
        <p className={className}>
            &copy; {new Date().getFullYear()} {companyName}. Hak cipta dilindungi.
        </p>
    );
}

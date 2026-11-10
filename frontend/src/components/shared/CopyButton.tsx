import { Check, Copy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface CopyButtonProps {
    value: string;
    label: string;
}

export function CopyButton({ value, label }: CopyButtonProps) {
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!copied) {
            return undefined;
        }

        const timer = window.setTimeout(() => setCopied(false), 2000);

        return () => window.clearTimeout(timer);
    }, [copied]);

    const copy = async () => {
        if (!navigator.clipboard?.writeText) {
            toast.error('Browser tidak mendukung penyalinan otomatis.');

            return;
        }

        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
        } catch {
            toast.error('Tidak dapat menyalin teks ke clipboard.');
        }
    };

    return (
        <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground"
            aria-label={copied ? 'Tersalin' : label}
            title={copied ? 'Tersalin' : label}
            onClick={() => void copy()}
        >
            {copied ? (
                <Check aria-hidden="true" className="text-success" />
            ) : (
                <Copy aria-hidden="true" />
            )}
        </Button>
    );
}

import { cn } from 'cn';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface SearchInputProps {
    value: string;
    onChange: (value: string) => void;
    /** Names what is searched, for example "Cari nama role". */
    label: string;
    placeholder: string;
    className?: string;
}

export function SearchInput({ value, onChange, label, placeholder, className }: SearchInputProps) {
    return (
        <div className={cn('relative w-full sm:max-w-xs', className)}>
            <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
                type="search"
                aria-label={label}
                placeholder={placeholder}
                className={cn(
                    'pl-9 [&::-webkit-search-cancel-button]:hidden',
                    value !== '' && 'pr-8',
                )}
                value={value}
                onChange={(event) => onChange(event.target.value)}
            />
            {value !== '' && (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Hapus pencarian"
                    className="absolute top-1/2 right-1.5 -translate-y-1/2 text-muted-foreground"
                    onClick={() => onChange('')}
                >
                    <X aria-hidden="true" />
                </Button>
            )}
        </div>
    );
}

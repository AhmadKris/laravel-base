import { cn } from 'cn';
import { Search } from 'lucide-react';
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
                className="pl-9"
                value={value}
                onChange={(event) => onChange(event.target.value)}
            />
        </div>
    );
}

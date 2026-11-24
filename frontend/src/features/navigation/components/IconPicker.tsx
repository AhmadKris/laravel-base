import { RotateCcw, Search } from 'lucide-react';
import { type KeyboardEvent, useId, useRef, useState } from 'react';
import { NavigationIcon } from '@/components/layouts/navigationIcons';
import { findNavigationIcon } from '@/components/layouts/navigationIconSet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const COLUMNS = 8;

interface IconPickerProps {
    /** The chosen icon, or null for the icon the module registers. */
    value: string | null;
    defaultIcon: string;
    /** Icon names the backend allows. */
    icons: string[];
    itemLabel: string;
    onChange: (icon: string | null) => void;
}

export function IconPicker({ value, defaultIcon, icons, itemLabel, onChange }: IconPickerProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const gridRef = useRef<HTMLDivElement>(null);
    const searchId = useId();
    const current = value ?? defaultIcon;
    const currentLabel = findNavigationIcon(current)?.label ?? current;
    const terms = search.trim().toLowerCase().split(/\s+/).filter(Boolean);

    const options = icons.flatMap((name) => {
        const entry = findNavigationIcon(name);

        if (entry === undefined) {
            return [];
        }

        const haystack = `${entry.label} ${name} ${entry.keywords}`.toLowerCase();

        return terms.every((term) => haystack.includes(term)) ? [{ name, label: entry.label }] : [];
    });

    const choose = (name: string | null) => {
        // Picking the registered icon keeps following it if the module changes it later.
        onChange(name === defaultIcon ? null : name);
        setOpen(false);
    };

    const focusOption = (index: number) => {
        const buttons = gridRef.current?.querySelectorAll<HTMLButtonElement>('button');

        buttons?.[Math.max(0, Math.min(index, buttons.length - 1))]?.focus();
    };

    const moveFocus = (event: KeyboardEvent<HTMLDivElement>) => {
        const buttons = Array.from(gridRef.current?.querySelectorAll('button') ?? []);
        const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
        const offsets: Record<string, number> = {
            ArrowRight: 1,
            ArrowLeft: -1,
            ArrowDown: COLUMNS,
            ArrowUp: -COLUMNS,
        };

        if (index === -1 || !(event.key in offsets)) {
            return;
        }

        event.preventDefault();
        focusOption(index + offsets[event.key]);
    };

    return (
        <Popover
            open={open}
            onOpenChange={(next) => {
                setOpen(next);
                setSearch('');
            }}
        >
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    size="icon-lg"
                    className="shrink-0"
                    aria-label={`Ikon menu ${itemLabel}: ${currentLabel}`}
                    title="Ganti ikon"
                >
                    <NavigationIcon name={current} className="size-4" />
                </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="grid w-80 gap-3 p-3">
                <div className="relative">
                    <Search
                        aria-hidden="true"
                        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                    />
                    <label htmlFor={searchId} className="sr-only">
                        Cari ikon
                    </label>
                    <Input
                        id={searchId}
                        value={search}
                        placeholder="Cari ikon, misalnya gudang"
                        className="pl-8"
                        autoFocus
                        onChange={(event) => setSearch(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'ArrowDown') {
                                event.preventDefault();
                                focusOption(0);
                            }

                            if (event.key === 'Enter') {
                                event.preventDefault();

                                if (options.length > 0) {
                                    choose(options[0].name);
                                }
                            }
                        }}
                    />
                </div>
                {options.length === 0 ? (
                    <p className="py-6 text-center text-xs text-muted-foreground">
                        Tidak ada ikon yang cocok dengan "{search.trim()}".
                    </p>
                ) : (
                    <div
                        ref={gridRef}
                        role="group"
                        aria-label={`Pilihan ikon untuk menu ${itemLabel}`}
                        className="grid max-h-60 grid-cols-8 gap-1 overflow-y-auto"
                        onKeyDown={moveFocus}
                    >
                        {options.map((option) => {
                            const selected = option.name === current;

                            return (
                                <Button
                                    key={option.name}
                                    type="button"
                                    variant={selected ? 'default' : 'ghost'}
                                    size="icon"
                                    aria-label={option.label}
                                    aria-pressed={selected}
                                    title={option.label}
                                    onClick={() => choose(option.name)}
                                >
                                    <NavigationIcon name={option.name} className="size-4" />
                                </Button>
                            );
                        })}
                    </div>
                )}
                <div className="flex items-center justify-between gap-2 border-t pt-2">
                    <span className="truncate text-xs text-muted-foreground">
                        Terpilih: {currentLabel}
                    </span>
                    {value !== null && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => choose(null)}
                        >
                            <RotateCcw aria-hidden="true" />
                            Pakai ikon bawaan
                        </Button>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}

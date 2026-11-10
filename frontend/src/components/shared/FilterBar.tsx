import { ListFilter } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';

interface FilterBarProps {
    /** The filter controls. The search field stays outside, so it is always in view. */
    children: ReactNode;
    /** Filters that differ from their default, shown on the phone button. */
    activeCount: number;
}

/**
 * Shows the filters in one row on larger screens. On phones they move into a sheet opened by one
 * "Filter" button, so the list starts near the top of the screen.
 */
export function FilterBar({ children, activeCount }: FilterBarProps) {
    const isMobile = useIsMobile();
    const [open, setOpen] = useState(false);

    if (!isMobile) {
        return <div className="flex flex-wrap items-center gap-2">{children}</div>;
    }

    const label = activeCount > 0 ? `Filter, ${activeCount} aktif` : 'Filter';

    return (
        <>
            <Button variant="outline" className="justify-start" onClick={() => setOpen(true)}>
                <ListFilter aria-hidden="true" className="text-muted-foreground" />
                {label}
            </Button>
            <Sheet open={open} onOpenChange={setOpen}>
                <SheetContent side="bottom" className="max-h-[85svh] overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle>{label}</SheetTitle>
                        <SheetDescription>
                            Daftar berubah setiap kali filter diubah.
                        </SheetDescription>
                    </SheetHeader>
                    <div className="grid gap-3 px-4 *:w-full">{children}</div>
                    <SheetFooter>
                        <Button onClick={() => setOpen(false)}>Tampilkan hasil</Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        </>
    );
}

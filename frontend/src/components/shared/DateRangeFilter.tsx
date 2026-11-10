import { CalendarDays, Check, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { id as idLocale } from 'react-day-picker/locale';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { DATE_PRESETS, type DateRange, rangeDays, rangeLabel, todayIn } from '@/lib/date-range';

interface DateRangeFilterProps {
    value: DateRange;
    onChange: (range: DateRange) => void;
    timeZone: string | undefined;
}

interface Draft {
    from: string;
    to?: string;
}

// The calendar works with local Date objects, so a day is carried as local midnight and read
// back from its local parts. The day itself is always a day in the company zone.
function toCalendarDay(date: string): Date {
    const [year, month, day] = date.split('-').map(Number);

    return new Date(year, month - 1, day);
}

function fromCalendarDay(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * One field for a date range: common presets first, then a calendar for any other range.
 */
export function DateRangeFilter({ value, onChange, timeZone }: DateRangeFilterProps) {
    const [open, setOpen] = useState(false);
    const today = todayIn(timeZone);
    const current = rangeDays(value, timeZone);
    const [draft, setDraft] = useState<Draft | undefined>(current);
    const [month, setMonth] = useState(toCalendarDay(current?.to ?? today));
    const label = rangeLabel(value);

    const choose = (range: DateRange) => {
        onChange(range);
        setOpen(false);
    };

    const openChange = (next: boolean) => {
        // Show the range in use, so adjusting it starts from what the list shows.
        if (next) {
            setDraft(current);
            setMonth(toCalendarDay(current?.to ?? today));
        }

        setOpen(next);
    };

    // The first click always starts a new range and the second one closes it, which is easier
    // to predict than moving whichever end is nearer.
    const pick = (date: string) => {
        if (draft === undefined || draft.to !== undefined) {
            setDraft({ from: date });

            return;
        }

        setDraft(
            date < draft.from ? { from: date, to: draft.from } : { from: draft.from, to: date },
        );
    };

    const complete = draft?.to !== undefined ? { from: draft.from, to: draft.to } : undefined;

    return (
        <Popover open={open} onOpenChange={openChange}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className="w-full justify-between font-normal sm:w-auto sm:min-w-52"
                    aria-label={`Rentang waktu: ${label}`}
                >
                    <span className="flex min-w-0 items-center gap-2">
                        <CalendarDays aria-hidden="true" className="text-muted-foreground" />
                        <span className="truncate">{label}</span>
                    </span>
                    <ChevronDown aria-hidden="true" className="text-muted-foreground" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                align="start"
                className="flex max-h-(--radix-popover-content-available-height) w-[min(20rem,calc(100vw-2rem))] flex-col gap-2 overflow-y-auto p-2 sm:w-auto sm:flex-row"
            >
                <div
                    role="group"
                    aria-label="Pilihan cepat"
                    className="grid content-start gap-0.5 sm:w-44"
                >
                    {DATE_PRESETS.map((preset) => {
                        const isActive = value.preset === preset.value;

                        return (
                            <Button
                                key={preset.value}
                                variant="ghost"
                                className="justify-between font-normal"
                                aria-pressed={isActive}
                                onClick={() => choose({ preset: preset.value })}
                            >
                                {preset.label}
                                {isActive && <Check aria-hidden="true" />}
                            </Button>
                        );
                    })}
                </div>
                <Separator className="sm:hidden" />
                <Separator orientation="vertical" className="hidden sm:block" />
                <div role="group" aria-label="Rentang lain" className="grid gap-2">
                    <Calendar
                        mode="range"
                        locale={idLocale}
                        className="mx-auto p-0 [--cell-size:--spacing(9)]"
                        // A shaded today reads as part of the range, so today is marked by text.
                        classNames={{ today: 'font-semibold text-primary' }}
                        month={month}
                        onMonthChange={setMonth}
                        today={toCalendarDay(today)}
                        endMonth={toCalendarDay(today)}
                        disabled={{ after: toCalendarDay(today) }}
                        selected={
                            draft && {
                                from: toCalendarDay(draft.from),
                                to: draft.to === undefined ? undefined : toCalendarDay(draft.to),
                            }
                        }
                        onSelect={(_range, day) => pick(fromCalendarDay(day))}
                    />
                    <p aria-live="polite" className="px-1 text-sm text-muted-foreground">
                        {complete !== undefined
                            ? rangeLabel({ preset: 'custom', ...complete })
                            : draft !== undefined
                              ? 'Pilih tanggal akhir'
                              : 'Pilih tanggal mulai'}
                    </p>
                    <Button
                        size="sm"
                        disabled={complete === undefined}
                        onClick={() => {
                            if (complete !== undefined) {
                                choose({ preset: 'custom', ...complete });
                            }
                        }}
                    >
                        Terapkan rentang
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}

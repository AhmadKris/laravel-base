import { Check, Circle, Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { useState } from 'react';
import { type FieldValues, useWatch } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField, type FormFieldProps } from './FormField';

const MIN_PASSWORD_LENGTH = 12;

type PasswordFieldProps<TValues extends FieldValues> = Omit<
    FormFieldProps<TValues>,
    'type' | 'renderControl'
> & {
    showLengthHint?: boolean;
};

export function PasswordField<TValues extends FieldValues>({
    autoComplete,
    showLengthHint = false,
    ...fieldProps
}: PasswordFieldProps<TValues>) {
    const [isVisible, setIsVisible] = useState(false);
    const value = useWatch({ control: fieldProps.control, name: fieldProps.name });
    const length = typeof value === 'string' ? value.length : 0;
    const meetsMinLength = length >= MIN_PASSWORD_LENGTH;
    const Icon = isVisible ? EyeOff : Eye;

    return (
        <FormField
            {...fieldProps}
            renderControl={(field, attributes) => (
                <div className="grid gap-1.5">
                    <div className="relative">
                        <LockKeyhole
                            aria-hidden="true"
                            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                        />
                        <Input
                            {...field}
                            {...attributes}
                            value={field.value ?? ''}
                            type={isVisible ? 'text' : 'password'}
                            autoComplete={autoComplete}
                            className="pr-9 pl-9"
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            className="absolute top-1/2 right-1 -translate-y-1/2"
                            aria-label={isVisible ? 'Sembunyikan password' : 'Tampilkan password'}
                            onClick={() => setIsVisible((visible) => !visible)}
                        >
                            <Icon aria-hidden="true" />
                        </Button>
                    </div>
                    {showLengthHint && (
                        <p
                            className={
                                meetsMinLength
                                    ? 'flex items-center gap-1.5 text-xs text-success'
                                    : 'flex items-center gap-1.5 text-xs text-muted-foreground'
                            }
                        >
                            {meetsMinLength ? (
                                <Check aria-hidden="true" className="size-3.5 shrink-0" />
                            ) : (
                                <Circle aria-hidden="true" className="size-3.5 shrink-0" />
                            )}
                            <span>
                                {meetsMinLength
                                    ? 'Minimal 12 karakter terpenuhi'
                                    : `Minimal 12 karakter (${length}/12)`}
                            </span>
                        </p>
                    )}
                </div>
            )}
        />
    );
}

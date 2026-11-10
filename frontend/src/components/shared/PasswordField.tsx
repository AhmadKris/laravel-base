import { Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { useState } from 'react';
import type { FieldValues } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField, type FormFieldProps } from './FormField';

type PasswordFieldProps<TValues extends FieldValues> = Omit<
    FormFieldProps<TValues>,
    'type' | 'renderControl'
>;

export function PasswordField<TValues extends FieldValues>({
    autoComplete,
    ...fieldProps
}: PasswordFieldProps<TValues>) {
    const [isVisible, setIsVisible] = useState(false);
    const Icon = isVisible ? EyeOff : Eye;

    return (
        <FormField
            {...fieldProps}
            renderControl={(field, attributes) => (
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
            )}
        />
    );
}

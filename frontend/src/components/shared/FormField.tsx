import { type ComponentProps, type ReactNode, useId } from 'react';
import {
    type Control,
    type ControllerRenderProps,
    type FieldPath,
    type FieldValues,
    useController,
} from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ControlAttributes {
    id: string;
    'aria-invalid': boolean;
    'aria-required'?: boolean;
    'aria-describedby': string | undefined;
}

type InputProps = Omit<ComponentProps<typeof Input>, 'name' | 'value' | 'defaultValue' | 'id'>;

export interface FormFieldProps<TValues extends FieldValues> extends InputProps {
    control: Control<TValues>;
    name: FieldPath<TValues>;
    label: string;
    description?: string;
    renderControl?: (
        field: ControllerRenderProps<TValues, FieldPath<TValues>>,
        attributes: ControlAttributes,
    ) => ReactNode;
}

export function FormField<TValues extends FieldValues>({
    control,
    name,
    label,
    description,
    required = false,
    renderControl,
    ...inputProps
}: FormFieldProps<TValues>) {
    const id = useId();
    const { field, fieldState } = useController({ control, name });
    const errorId = `${id}-error`;
    const descriptionId = `${id}-description`;
    const describedBy =
        [fieldState.error ? errorId : undefined, description ? descriptionId : undefined]
            .filter(Boolean)
            .join(' ') || undefined;

    const attributes: ControlAttributes = {
        id,
        'aria-invalid': fieldState.invalid,
        ...(required ? { 'aria-required': true } : {}),
        'aria-describedby': describedBy,
    };

    return (
        <div className="grid gap-1.5">
            <div className="flex items-center gap-0.5">
                <Label htmlFor={id}>{label}</Label>
                {required && (
                    <span
                        aria-hidden="true"
                        className="text-sm leading-none font-medium text-destructive"
                    >
                        *
                    </span>
                )}
            </div>
            {renderControl ? (
                renderControl(field, attributes)
            ) : (
                <Input {...inputProps} {...field} value={field.value ?? ''} {...attributes} />
            )}
            {description !== undefined && (
                <p id={descriptionId} className="text-xs text-muted-foreground">
                    {description}
                </p>
            )}
            {fieldState.error?.message !== undefined && (
                <p id={errorId} className="text-xs text-destructive">
                    {fieldState.error.message}
                </p>
            )}
        </div>
    );
}

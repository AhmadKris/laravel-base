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
    'aria-describedby': string | undefined;
}

type InputProps = Omit<ComponentProps<typeof Input>, 'name' | 'value' | 'defaultValue' | 'id'>;

interface FormFieldProps<TValues extends FieldValues> extends InputProps {
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
        'aria-describedby': describedBy,
    };

    return (
        <div className="grid gap-1.5">
            <Label htmlFor={id}>{label}</Label>
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

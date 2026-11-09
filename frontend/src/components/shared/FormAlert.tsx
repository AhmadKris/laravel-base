interface FormAlertProps {
    message: string | undefined;
}

export function FormAlert({ message }: FormAlertProps) {
    if (message === undefined) {
        return null;
    }

    return (
        <p role="alert" className="text-sm text-destructive">
            {message}
        </p>
    );
}

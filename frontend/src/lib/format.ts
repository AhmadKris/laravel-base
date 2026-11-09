const dateTimeFormat = new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
});

export function formatDateTime(value: string): string {
    return dateTimeFormat.format(new Date(value));
}

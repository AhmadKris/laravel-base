function createFormat(timeZone: string | undefined): Intl.DateTimeFormat {
    const options: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' };

    try {
        return new Intl.DateTimeFormat('id-ID', { ...options, timeZone });
    } catch (error) {
        // A zone the server accepts but this browser does not know falls back to the browser zone.
        if (error instanceof RangeError) {
            return new Intl.DateTimeFormat('id-ID', options);
        }

        throw error;
    }
}

let dateTimeFormat = createFormat(undefined);
let currentTimeZone: string | undefined;

/**
 * Sets the zone every date is shown in. Called by the root route before the pages render.
 */
export function setDisplayTimeZone(timeZone: string | undefined): void {
    if (timeZone !== currentTimeZone) {
        currentTimeZone = timeZone;
        dateTimeFormat = createFormat(timeZone);
    }
}

export function formatDateTime(value: string): string {
    return dateTimeFormat.format(new Date(value));
}

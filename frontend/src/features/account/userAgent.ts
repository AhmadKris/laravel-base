const BROWSERS: [RegExp, string][] = [
    [/Edg\//, 'Edge'],
    [/OPR\/|Opera/, 'Opera'],
    [/Firefox\//, 'Firefox'],
    [/Chrome\//, 'Chrome'],
    [/Safari\//, 'Safari'],
];

const SYSTEMS: [RegExp, string][] = [
    [/Android/, 'Android'],
    [/iPhone|iPad|iPod/, 'iOS'],
    [/Windows/, 'Windows'],
    [/Mac OS X|Macintosh/, 'macOS'],
    [/Linux/, 'Linux'],
];

function match(rules: [RegExp, string][], userAgent: string): string | undefined {
    return rules.find(([pattern]) => pattern.test(userAgent))?.[1];
}

/**
 * A short device name such as "Chrome di Windows". Only the common browsers are named; the full
 * text stays available for anything else.
 */
export function describeUserAgent(userAgent: string | null): string {
    if (userAgent === null || userAgent.trim() === '') {
        return 'Perangkat tidak dikenal';
    }

    const browser = match(BROWSERS, userAgent);
    const system = match(SYSTEMS, userAgent);

    if (browser !== undefined && system !== undefined) {
        return `${browser} di ${system}`;
    }

    return browser ?? system ?? 'Perangkat tidak dikenal';
}

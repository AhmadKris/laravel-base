import { describe, expect, it } from 'vitest';
import css from '@/index.css?raw';

interface Color {
    lightness: number;
    chroma: number;
    hue: number;
    alpha: number;
}

type LinearRgb = [number, number, number];

function readTokens(selector: string): Record<string, Color> {
    const start = css.indexOf(`${selector} {`);
    const block = css.slice(start, css.indexOf('}', start));
    const tokens: Record<string, Color> = {};

    for (const [, name, value] of block.matchAll(/--([a-z0-9-]+):\s*oklch\(([^)]+)\)/g)) {
        const [lightness, chroma, hue, alpha] = value.replace('/', ' ').split(/\s+/);

        tokens[name] = {
            lightness: Number(lightness),
            chroma: Number(chroma),
            hue: Number(hue),
            alpha: alpha === undefined ? 1 : parseFloat(alpha) / 100,
        };
    }

    return tokens;
}

function toLinearRgb({ lightness, chroma, hue }: Color): LinearRgb {
    const a = chroma * Math.cos((hue * Math.PI) / 180);
    const b = chroma * Math.sin((hue * Math.PI) / 180);
    const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
    const clamp = (value: number) => Math.min(1, Math.max(0, value));

    return [
        clamp(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
        clamp(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
        clamp(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
    ];
}

const encode = (value: number) =>
    value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055;
const decode = (value: number) =>
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;

function blend(top: LinearRgb, bottom: LinearRgb, alpha: number): LinearRgb {
    return top.map((channel, index) =>
        decode(encode(channel) * alpha + encode(bottom[index]) * (1 - alpha)),
    ) as LinearRgb;
}

const luminance = ([r, g, b]: LinearRgb) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

function contrast(first: LinearRgb, second: LinearRgb): number {
    const [high, low] = [luminance(first), luminance(second)].sort((x, y) => y - x);

    return (high + 0.05) / (low + 0.05);
}

const TEXT_MINIMUM = 4.5;
const CONTROL_MINIMUM = 3;

const TEXT_PAIRS = [
    ['foreground', 'background'],
    ['muted-foreground', 'background'],
    ['muted-foreground', 'muted'],
    ['muted-foreground', 'card'],
    ['muted-foreground', 'sidebar'],
    ['muted-foreground', 'popover'],
    ['card-foreground', 'card'],
    ['brand-foreground', 'brand'],
    ['brand-muted', 'brand'],
    ['brand-accent', 'brand'],
    ['primary', 'background'],
    ['primary-foreground', 'primary'],
    ['destructive-solid-foreground', 'destructive-solid'],
    ['warning-solid-foreground', 'warning-solid'],
    ['destructive', 'background'],
    ['popover-foreground', 'popover'],
    ['sidebar-foreground', 'sidebar'],
    ['sidebar-accent-foreground', 'sidebar-accent'],
    ['sidebar-primary-foreground', 'sidebar-primary'],
];

const CONTROL_PAIRS = [
    ['input', 'background'],
    ['input', 'card'],
    ['destructive-solid', 'popover'],
    ['warning-solid', 'popover'],
    ['ring', 'background'],
    ['sidebar-ring', 'sidebar'],
];

const THEMES: [string, string, number][] = [
    ['light', ':root', 0.1],
    ['dark', '.dark', 0.2],
];

describe.each(THEMES)('%s theme contrast', (_name, selector, badgeTint) => {
    const tokens = readTokens(selector);
    const measure = (foreground: string, background: string) => {
        const base = toLinearRgb(tokens[background]);

        return contrast(
            blend(toLinearRgb(tokens[foreground]), base, tokens[foreground].alpha),
            base,
        );
    };

    it.each(TEXT_PAIRS)('%s on %s is readable', (foreground, background) => {
        expect(measure(foreground, background)).toBeGreaterThanOrEqual(TEXT_MINIMUM);
    });

    it.each(CONTROL_PAIRS)('%s on %s is visible', (foreground, background) => {
        expect(measure(foreground, background)).toBeGreaterThanOrEqual(CONTROL_MINIMUM);
    });

    it.each(['success', 'warning', 'info', 'destructive'])(
        '%s badge text is readable on its tint',
        (status) => {
            const color = toLinearRgb(tokens[status]);
            const tint = blend(color, toLinearRgb(tokens.background), badgeTint);

            expect(contrast(color, tint)).toBeGreaterThanOrEqual(TEXT_MINIMUM);
        },
    );
});

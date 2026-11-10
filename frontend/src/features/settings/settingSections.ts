import { z } from 'zod';
import type { ConfigurationValue, SystemConfiguration } from '@/types/api-response';

export type SettingFormValue = string | boolean;

interface FieldBase {
    key: string;
    label: string;
    description?: string;
    schema: z.ZodType<SettingFormValue, SettingFormValue>;
}

export type SettingField =
    | (FieldBase & {
          kind: 'text';
          inputType: 'text' | 'email' | 'tel';
          maxLength: number;
          required: boolean;
          uppercase?: boolean;
      })
    | (FieldBase & { kind: 'select'; options: SelectOption[] })
    | (FieldBase & { kind: 'boolean' });

export interface SelectOption {
    value: string;
    label: string;
}

export interface SettingSection {
    id: string;
    title: string;
    saveLabel: string;
    fields: SettingField[];
}

function optionalText(label: string, max: number) {
    return z.string().trim().max(max, `${label} maksimal ${max} karakter.`);
}

function requiredText(label: string, max: number) {
    return optionalText(label, max).min(1, `${label} wajib diisi.`);
}

function selectValue(label: string) {
    return z.string().min(1, `${label} wajib dipilih.`);
}

function timezoneOptions(): SelectOption[] {
    return Intl.supportedValuesOf('timeZone').map((zone) => ({ value: zone, label: zone }));
}

const FIXED_SECTIONS: SettingSection[] = [
    {
        id: 'company',
        title: 'Perusahaan',
        saveLabel: 'Simpan data perusahaan',
        fields: [
            {
                key: 'company.name',
                label: 'Nama perusahaan',
                kind: 'text',
                inputType: 'text',
                maxLength: 150,
                required: true,
                schema: requiredText('Nama perusahaan', 150),
            },
            {
                key: 'company.address',
                label: 'Alamat',
                kind: 'text',
                inputType: 'text',
                maxLength: 500,
                required: false,
                schema: optionalText('Alamat', 500),
            },
            {
                key: 'company.phone',
                label: 'Telepon',
                kind: 'text',
                inputType: 'tel',
                maxLength: 30,
                required: false,
                schema: optionalText('Telepon', 30),
            },
            {
                key: 'company.email',
                label: 'Email',
                kind: 'text',
                inputType: 'email',
                maxLength: 255,
                required: false,
                schema: optionalText('Email', 255).refine(
                    (value) => value === '' || z.email().safeParse(value).success,
                    'Email harus berupa alamat email yang valid.',
                ),
            },
        ],
    },
    {
        id: 'logo-display',
        title: 'Tampilan logo',
        saveLabel: 'Simpan tampilan logo',
        fields: [
            {
                key: 'company.logo_show_name',
                label: 'Tampilkan nama aplikasi di samping logo',
                kind: 'boolean',
                schema: z.boolean(),
            },
            {
                key: 'company.logo_background',
                label: 'Latar logo',
                description: 'Pilih Putih atau Warna utama untuk logo yang tidak transparan.',
                kind: 'select',
                options: [
                    { value: 'transparent', label: 'Transparan' },
                    { value: 'white', label: 'Putih' },
                    { value: 'primary', label: 'Warna utama' },
                ],
                schema: selectValue('Latar logo'),
            },
            {
                key: 'company.logo_size',
                label: 'Ukuran logo',
                kind: 'select',
                options: [
                    { value: 'small', label: 'Kecil' },
                    { value: 'medium', label: 'Sedang' },
                    { value: 'large', label: 'Besar' },
                ],
                schema: selectValue('Ukuran logo'),
            },
        ],
    },
    {
        id: 'localization',
        title: 'Lokalisasi',
        saveLabel: 'Simpan lokalisasi',
        fields: [
            {
                key: 'localization.timezone',
                label: 'Zona waktu',
                kind: 'select',
                options: timezoneOptions(),
                schema: selectValue('Zona waktu'),
            },
            {
                key: 'localization.locale',
                label: 'Bahasa',
                kind: 'select',
                options: [
                    { value: 'id', label: 'Bahasa Indonesia' },
                    { value: 'en', label: 'English' },
                ],
                schema: selectValue('Bahasa'),
            },
            {
                key: 'localization.currency',
                label: 'Mata uang',
                description: 'Kode ISO 4217 tiga huruf, misalnya IDR.',
                kind: 'text',
                inputType: 'text',
                maxLength: 3,
                required: true,
                uppercase: true,
                schema: z
                    .string()
                    .trim()
                    .regex(/^[A-Z]{3}$/, 'Mata uang harus berupa kode tiga huruf, misalnya IDR.'),
            },
        ],
    },
];

const FEATURE_PREFIX = 'feature.';

function featureSection(configurations: SystemConfiguration[]): SettingSection {
    return {
        id: 'feature',
        title: 'Fitur',
        saveLabel: 'Simpan pengaturan fitur',
        fields: configurations
            .filter(({ key }) => key.startsWith(FEATURE_PREFIX))
            .map(({ key, description }) => ({
                key,
                label: description ?? key,
                description: description === null ? undefined : key,
                kind: 'boolean',
                schema: z.boolean(),
            })),
    };
}

// These keys hold uploaded files, which have their own section instead of a text field.
const BRANDING_KEYS = ['company.logo', 'company.logo_dark', 'company.favicon'];

export interface ArrangedSettings {
    sections: { section: SettingSection; items: SystemConfiguration[] }[];
    others: SystemConfiguration[];
    hasBranding: boolean;
}

/**
 * Places known keys in their sections. Sensitive and unknown keys are listed read-only.
 */
export function arrangeSettings(all: SystemConfiguration[]): ArrangedSettings {
    const configurations = all.filter((item) => !BRANDING_KEYS.includes(item.key));
    const editable = configurations.filter((item) => !item.is_sensitive);
    const byKey = new Map(editable.map((item) => [item.key, item]));
    const placed = new Set<string>();

    const sections = [...FIXED_SECTIONS, featureSection(editable)].flatMap((section) => {
        const fields = section.fields.filter((field) => byKey.has(field.key));

        if (fields.length === 0) {
            return [];
        }

        fields.forEach((field) => placed.add(field.key));

        return [
            {
                section: { ...section, fields },
                items: fields.map((field) => byKey.get(field.key) as SystemConfiguration),
            },
        ];
    });

    return {
        sections,
        others: configurations.filter((item) => !placed.has(item.key)),
        hasBranding: all.some((item) => BRANDING_KEYS.includes(item.key)),
    };
}

// Keys contain dots, which React Hook Form would read as nested paths.
export function fieldName(key: string): string {
    return key.replaceAll('.', '__');
}

export function toFormValue(field: SettingField, value: ConfigurationValue): SettingFormValue {
    if (field.kind === 'boolean') {
        return value === true;
    }

    return typeof value === 'string' ? value : '';
}

export function toPayloadValue(
    field: SettingField,
    value: SettingFormValue,
): string | boolean | null {
    if (typeof value === 'boolean') {
        return value;
    }

    const text = value.trim();

    return text === '' && field.kind === 'text' && !field.required ? null : text;
}

export function displayValue(field: SettingField, value: ConfigurationValue): string {
    if (field.kind === 'boolean') {
        return value === true ? 'Aktif' : 'Nonaktif';
    }

    if (field.kind === 'select') {
        return (
            field.options.find((option) => option.value === value)?.label ?? String(value ?? '-')
        );
    }

    return typeof value === 'string' && value !== '' ? value : '-';
}

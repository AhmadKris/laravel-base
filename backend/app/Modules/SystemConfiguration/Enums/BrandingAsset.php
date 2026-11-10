<?php

declare(strict_types=1);

namespace App\Modules\SystemConfiguration\Enums;

enum BrandingAsset: string
{
    case Logo = 'logo';
    case LogoDark = 'logo-dark';
    case Favicon = 'favicon';

    public function key(): string
    {
        return 'company.'.str_replace('-', '_', $this->value);
    }

    /**
     * The name used in the GET /branding response.
     */
    public function responseKey(): string
    {
        return str_replace('-', '_', $this->value);
    }

    public function label(): string
    {
        return match ($this) {
            self::Logo => 'Logo',
            self::LogoDark => 'Logo latar gelap',
            self::Favicon => 'Favicon',
        };
    }

    /**
     * SVG is excluded because it can carry script.
     *
     * @return list<string>
     */
    public function extensions(): array
    {
        return match ($this) {
            self::Logo, self::LogoDark => ['png', 'jpg', 'jpeg', 'webp'],
            self::Favicon => ['png', 'ico'],
        };
    }

    public function maxKilobytes(): int
    {
        return match ($this) {
            self::Logo, self::LogoDark => 2048,
            self::Favicon => 1024,
        };
    }

    public function dimensionsRule(): string
    {
        return match ($this) {
            self::Logo, self::LogoDark => 'dimensions:max_width=2048,max_height=2048',
            self::Favicon => 'dimensions:ratio=1,min_width=16,max_width=512',
        };
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        $label = $this->label();
        $formats = $this === self::Favicon ? 'PNG atau ICO' : 'PNG, JPG, atau WebP';

        return [
            'file.required' => 'Pilih file '.lcfirst($label).'.',
            'file.file' => "{$label} harus berupa file.",
            'file.extensions' => "{$label} harus berupa file {$formats}.",
            'file.mimes' => "{$label} harus berupa file {$formats}.",
            'file.max' => $label.' maksimal '.($this->maxKilobytes() / 1024).' MB.',
            'file.dimensions' => $this === self::Favicon
                ? 'Favicon harus persegi, 16 sampai 512 piksel.'
                : "{$label} maksimal 2048 x 2048 piksel.",
        ];
    }

    /**
     * @return list<string>
     */
    public static function keys(): array
    {
        return array_map(fn (self $asset): string => $asset->key(), self::cases());
    }
}

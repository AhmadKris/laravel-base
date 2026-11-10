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
            self::Favicon => ['png', 'jpg', 'jpeg', 'webp', 'ico'],
        };
    }

    public function maxKilobytes(): int
    {
        return match ($this) {
            self::Logo, self::LogoDark => 2048,
            self::Favicon => 1024,
        };
    }

    /**
     * The box an upload is scaled down to fit, so any size can be uploaded without preparing it first.
     *
     * @return array{int, int} width and height in pixels
     */
    public function fitWithin(): array
    {
        return match ($this) {
            self::Logo, self::LogoDark => [1200, 400],
            self::Favicon => [256, 256],
        };
    }

    /**
     * Browsers show favicons in a square, so other shapes get transparent space instead of being stretched.
     */
    public function padsToSquare(): bool
    {
        return $this === self::Favicon;
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        $label = $this->label();
        $formats = $this === self::Favicon ? 'PNG, JPG, WebP, atau ICO' : 'PNG, JPG, atau WebP';

        return [
            'file.required' => 'Pilih file '.lcfirst($label).'.',
            'file.file' => "{$label} harus berupa file.",
            'file.extensions' => "{$label} harus berupa file {$formats}.",
            'file.mimes' => "{$label} harus berupa file {$formats}.",
            'file.max' => $label.' maksimal '.($this->maxKilobytes() / 1024).' MB.',
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

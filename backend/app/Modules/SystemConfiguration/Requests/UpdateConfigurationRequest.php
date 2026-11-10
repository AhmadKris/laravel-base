<?php

declare(strict_types=1);

namespace App\Modules\SystemConfiguration\Requests;

use App\Modules\SystemConfiguration\Enums\BrandingAsset;
use App\Modules\SystemConfiguration\Models\SystemConfiguration;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Lang;

final class UpdateConfigurationRequest extends FormRequest
{
    private const int MAX_ENCODED_LENGTH = 10000;

    private const array VALUE_RULES = [
        'company.name' => ['required', 'string', 'max:150'],
        'company.address' => ['nullable', 'string', 'max:500'],
        'company.phone' => ['nullable', 'string', 'max:30'],
        'company.email' => ['nullable', 'string', 'email', 'max:255'],
        'company.logo_show_name' => ['required', 'boolean:strict'],
        'company.logo_background' => ['required', 'string', 'in:transparent,white,primary'],
        'company.logo_size' => ['required', 'string', 'in:small,medium,large'],
        'localization.timezone' => ['required', 'string', 'timezone'],
        'localization.locale' => ['required', 'string', 'in:id,en'],
        'localization.currency' => ['required', 'string', 'size:3'],
    ];

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $configuration = $this->configuration();

        // Branding keys hold a file path, which only the upload endpoint may write.
        if (in_array($configuration->key, BrandingAsset::keys(), true)) {
            return ['value' => ['present', 'missing'], 'version' => ['required', 'integer', 'min:1']];
        }

        $valueRules = str_starts_with($configuration->key, 'feature.')
            ? ['required', 'boolean']
            : self::VALUE_RULES[$configuration->key] ?? [];

        return [
            'value' => ['present', ...$valueRules, $this->withinSizeLimit(...)],
            'version' => ['required', 'integer', 'min:1'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        // Keys contain dots, so they are looked up in the array instead of as a translation path.
        $attributes = Lang::get('validation.attributes');
        $name = is_array($attributes) ? ($attributes[$this->configuration()->key] ?? null) : null;

        return is_string($name) ? ['value' => $name] : [];
    }

    private function configuration(): SystemConfiguration
    {
        /** @var SystemConfiguration */
        return $this->route('configuration');
    }

    private function withinSizeLimit(string $attribute, mixed $value, Closure $fail): void
    {
        if (strlen((string) json_encode($value)) > self::MAX_ENCODED_LENGTH) {
            $fail('validation.configuration_value_too_large')->translate();
        }
    }
}

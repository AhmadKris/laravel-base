<?php

declare(strict_types=1);

namespace App\Modules\SystemConfiguration\Requests;

use App\Modules\SystemConfiguration\Models\SystemConfiguration;
use Closure;
use Illuminate\Foundation\Http\FormRequest;

final class UpdateConfigurationRequest extends FormRequest
{
    private const int MAX_ENCODED_LENGTH = 10000;

    private const array VALUE_RULES = [
        'company.name' => ['required', 'string', 'max:150'],
        'company.address' => ['nullable', 'string', 'max:500'],
        'company.phone' => ['nullable', 'string', 'max:30'],
        'company.email' => ['nullable', 'string', 'email', 'max:255'],
        'localization.timezone' => ['required', 'string', 'timezone'],
        'localization.locale' => ['required', 'string', 'in:id,en'],
        'localization.currency' => ['required', 'string', 'size:3'],
    ];

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        /** @var SystemConfiguration $configuration */
        $configuration = $this->route('configuration');

        $valueRules = str_starts_with($configuration->key, 'feature.')
            ? ['required', 'boolean']
            : self::VALUE_RULES[$configuration->key] ?? [];

        return [
            'value' => ['present', ...$valueRules, $this->withinSizeLimit(...)],
            'version' => ['required', 'integer', 'min:1'],
        ];
    }

    private function withinSizeLimit(string $attribute, mixed $value, Closure $fail): void
    {
        if (strlen((string) json_encode($value)) > self::MAX_ENCODED_LENGTH) {
            $fail('The value is too large.');
        }
    }
}

<?php

declare(strict_types=1);

namespace App\Modules\SystemConfiguration\Services;

use App\Modules\SystemConfiguration\Models\SystemConfiguration;
use App\Shared\Contracts\CompanyProfile;

/**
 * Bound as scoped, so the values are read once per request or queued job and never go stale in
 * a long-running worker.
 */
final class ConfiguredCompanyProfile implements CompanyProfile
{
    private const array KEYS = ['company.name', 'company.email', 'company.address', 'company.phone'];

    /** @var array<string, mixed>|null */
    private ?array $values = null;

    public function name(): string
    {
        $name = $this->value('company.name');

        return $name ?? (string) config('app.name');
    }

    public function email(): ?string
    {
        return $this->value('company.email');
    }

    public function address(): ?string
    {
        return $this->value('company.address');
    }

    public function phone(): ?string
    {
        return $this->value('company.phone');
    }

    private function value(string $key): ?string
    {
        $this->values ??= SystemConfiguration::query()->whereIn('key', self::KEYS)->pluck('value', 'key')->all();
        $value = $this->values[$key] ?? null;

        return is_string($value) && trim($value) !== '' ? trim($value) : null;
    }
}

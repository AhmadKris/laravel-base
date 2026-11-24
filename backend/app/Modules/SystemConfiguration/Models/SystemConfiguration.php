<?php

declare(strict_types=1);

namespace App\Modules\SystemConfiguration\Models;

use App\Modules\SystemConfiguration\Policies\SystemConfigurationPolicy;
use App\Modules\UserManagement\Models\User;
use App\Shared\Traits\HasOptimisticLock;
use Database\Factories\SystemConfigurationFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\UseFactory;
use Illuminate\Database\Eloquent\Attributes\UsePolicy;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * @property mixed $value Decoded JSON: text, number, boolean, list, object, or null depending on the key.
 */
#[Fillable(['key', 'value', 'is_public', 'is_sensitive', 'description', 'updated_by'])]
#[UseFactory(SystemConfigurationFactory::class)]
#[UsePolicy(SystemConfigurationPolicy::class)]
class SystemConfiguration extends Model
{
    /** @use HasFactory<SystemConfigurationFactory> */
    use HasFactory;

    use HasOptimisticLock;

    public const string BRANDING_DISK = 'local';

    public const string BRANDING_DIRECTORY = 'branding';

    public const string NAVIGATION_LAYOUT = 'navigation.layout';

    public const string DISABLED_MODULES = 'modules.disabled';

    /**
     * Keys only written by their own endpoint, which validates them against the code, as default value and description.
     */
    private const array MANAGED_KEYS = [
        self::NAVIGATION_LAYOUT => [null, 'Susunan menu'],
        self::DISABLED_MODULES => [[], 'Modul yang dinonaktifkan'],
    ];

    private const array BRANDING_CONTENT_TYPES = [
        'png' => 'image/png',
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'webp' => 'image/webp',
        'ico' => 'image/x-icon',
    ];

    public function getRouteKeyName(): string
    {
        return 'key';
    }

    public static function isManagedKey(string $key): bool
    {
        return isset(self::MANAGED_KEYS[$key]);
    }

    /**
     * The row of a managed key, created with its default on first use so a deployment needs no extra step.
     */
    public static function managed(string $key): self
    {
        [$default, $description] = self::MANAGED_KEYS[$key];

        $configuration = self::query()->firstOrCreate(['key' => $key], [
            'value' => $default,
            'is_public' => false,
            'is_sensitive' => false,
            'description' => $description,
        ]);

        // A new row has to be read back for the version the database filled in.
        return $configuration->wasRecentlyCreated ? $configuration->refresh() : $configuration;
    }

    public static function storedValue(string $key): mixed
    {
        return self::query()->where('key', $key)->first()?->value;
    }

    /**
     * Only a path with the shape written by the upload is returned, so a stored value can never point elsewhere.
     */
    public function brandingPath(): ?string
    {
        $path = is_array($this->value) ? ($this->value['path'] ?? null) : null;
        $pattern = '#^'.self::BRANDING_DIRECTORY.'/[A-Za-z0-9]{40}\.('.implode('|', array_keys(self::BRANDING_CONTENT_TYPES)).')$#';

        return is_string($path) && preg_match($pattern, $path) === 1 ? $path : null;
    }

    public function brandingContentType(): ?string
    {
        $path = $this->brandingPath();

        return $path === null ? null : self::BRANDING_CONTENT_TYPES[pathinfo($path, PATHINFO_EXTENSION)];
    }

    /**
     * @param  Builder<self>  $query
     */
    public function scopeVisibleTo(Builder $query, User $viewer): void
    {
        if ($this->hasFullAccess($viewer)) {
            return;
        }

        $query->where(function (Builder $allowed): void {
            foreach ($this->allowedPrefixes() as $prefix) {
                $allowed->orWhere('key', 'like', $prefix.'%');
            }
        });
    }

    public function isVisibleTo(User $viewer): bool
    {
        return $this->hasFullAccess($viewer) || Str::startsWith($this->key, $this->allowedPrefixes());
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'value' => 'json',
            'is_public' => 'boolean',
            'is_sensitive' => 'boolean',
            'version' => 'integer',
        ];
    }

    private function hasFullAccess(User $viewer): bool
    {
        return $viewer->hasAnyRole(config('authorization.configuration_access.unrestricted_roles'));
    }

    /**
     * @return list<string>
     */
    private function allowedPrefixes(): array
    {
        return config('authorization.configuration_access.allowed_prefixes');
    }
}

<?php

declare(strict_types=1);

namespace App\Modules\UserManagement\Models;

use App\Modules\UserManagement\Policies\UserPolicy;
use App\Modules\UserManagement\Services\UserAccessService;
use App\Shared\Traits\HasPublicUuid;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Attributes\UseFactory;
use Illuminate\Database\Eloquent\Attributes\UsePolicy;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Spatie\Permission\Traits\HasRoles;

/**
 * @property Carbon|null $pending_email_expires_at
 */
#[Fillable(['name', 'email', 'password'])]
#[Hidden(['password', 'remember_token', 'avatar_path', 'pending_email_token'])]
#[UseFactory(UserFactory::class)]
#[UsePolicy(UserPolicy::class)]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory;

    use HasPublicUuid;
    use HasRoles;
    use Notifiable;
    use SoftDeletes;

    // Excludes @ so a login identifier can never be both a username and an email.
    public const string USERNAME_PATTERN = '/^[a-zA-Z0-9._-]+$/';

    public const string AVATAR_DISK = 'local';

    public const string AVATAR_DIRECTORY = 'avatars';

    protected string $guard_name = 'web';

    public static function normalizeIdentifier(string $identifier): string
    {
        return Str::lower(Str::trim($identifier));
    }

    /**
     * Only a path with the shape written by the upload is returned, so a stored value can never point elsewhere.
     */
    public function avatarPath(): ?string
    {
        $path = $this->avatar_path;

        return is_string($path) && preg_match('#^'.self::AVATAR_DIRECTORY.'/[A-Za-z0-9]{40}\.png$#', $path) === 1 ? $path : null;
    }

    /**
     * Changes with every upload, so the client can cache the image under a URL that carries it.
     */
    public function avatarVersion(): ?string
    {
        $path = $this->avatarPath();

        return $path === null ? null : substr(basename($path, '.png'), 0, 12);
    }

    /**
     * @param  Builder<self>  $query
     */
    public function scopeVisibleTo(Builder $query, self $viewer): void
    {
        if (! app(UserAccessService::class)->hasGlobalAccess($viewer)) {
            $query->whereKey($viewer->getKey());
        }
    }

    /**
     * @return Attribute<string, string>
     */
    protected function email(): Attribute
    {
        return Attribute::make(set: fn (string $value): string => self::normalizeIdentifier($value));
    }

    /**
     * @return Attribute<string|null, string|null>
     */
    protected function username(): Attribute
    {
        return Attribute::make(set: fn (?string $value): ?string => $value === null ? null : self::normalizeIdentifier($value));
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'pending_email_expires_at' => 'datetime',
            'is_active' => 'boolean',
            'password' => 'hashed',
        ];
    }
}

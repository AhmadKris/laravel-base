<?php

declare(strict_types=1);

namespace App\Core\Authorization\Models;

use App\Core\Authorization\Policies\RolePolicy;
use App\Modules\UserManagement\Models\User;
use App\Shared\Traits\HasOptimisticLock;
use Illuminate\Database\Eloquent\Attributes\UsePolicy;
use Illuminate\Database\Eloquent\Relations\MorphToMany;
use Spatie\Permission\Models\Role as SpatieRole;

/**
 * @property int $version
 */
#[UsePolicy(RolePolicy::class)]
class Role extends SpatieRole
{
    use HasOptimisticLock;

    public const string SUPER_ADMIN = 'Super Admin';

    private const array PROTECTED_ROLES = [self::SUPER_ADMIN, 'Admin', 'Staff', 'Viewer'];

    public function isProtected(): bool
    {
        return in_array($this->name, self::PROTECTED_ROLES, true);
    }

    /**
     * The parent resolves the model from the default guard, which is "sanctum" on API routes and has no provider.
     *
     * @return MorphToMany<User, $this>
     */
    public function users(): MorphToMany
    {
        return $this->morphedByMany(User::class, 'model', 'model_has_roles', 'role_id', 'model_id');
    }
}

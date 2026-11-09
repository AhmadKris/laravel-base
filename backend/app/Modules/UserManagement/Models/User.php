<?php

declare(strict_types=1);

namespace App\Modules\UserManagement\Models;

use App\Modules\Department\Models\Department;
use App\Modules\Department\Services\DepartmentAccessService;
use App\Shared\Traits\HasPublicUuid;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Attributes\UseFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Spatie\Permission\Traits\HasRoles;

#[Fillable(['name', 'email', 'password'])]
#[Hidden(['password', 'remember_token'])]
#[UseFactory(UserFactory::class)]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory;

    use HasPublicUuid;
    use HasRoles;
    use Notifiable;
    use SoftDeletes;

    protected string $guard_name = 'web';

    /**
     * @return BelongsTo<Department, $this>
     */
    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    /**
     * @param  Builder<self>  $query
     */
    public function scopeVisibleTo(Builder $query, self $viewer): void
    {
        if (app(DepartmentAccessService::class)->hasGlobalAccess($viewer)) {
            return;
        }

        $query->where(function (Builder $visible) use ($viewer): void {
            $visible->whereKey($viewer->getKey());

            if ($viewer->department_id !== null) {
                $visible->orWhere('department_id', $viewer->department_id);
            }
        });
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'is_active' => 'boolean',
            'password' => 'hashed',
        ];
    }
}

<?php

declare(strict_types=1);

namespace App\Core\Authorization\Resources;

use App\Core\Authorization\Models\Role;
use App\Core\Authorization\Services\RoleAssignmentService;
use App\Modules\UserManagement\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Role
 */
final class RoleResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $actor = $request->user();

        return [
            'id' => $this->id,
            'name' => $this->name,
            'is_protected' => $this->isProtected(),
            'can_assign' => $actor instanceof User && app(RoleAssignmentService::class)->canAssign($actor, $this->name),
            'users_count' => $this->whenCounted('users'),
            'permissions_count' => $this->whenCounted('permissions'),
            /** @var list<string> */
            'permissions' => $this->whenLoaded('permissions', fn () => $this->permissions->pluck('name')->sort()->values()),
            'version' => $this->version,
            'created_at' => $this->created_at,
        ];
    }
}

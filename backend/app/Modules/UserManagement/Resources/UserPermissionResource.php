<?php

declare(strict_types=1);

namespace App\Modules\UserManagement\Resources;

use App\Core\Authorization\Resources\PermissionResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Spatie\Permission\Models\Permission;

/**
 * @mixin Permission
 */
final class UserPermissionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            ...(new PermissionResource($this->resource))->toArray($request),
            /** @var list<string> Roles of the user that grant this permission. */
            'granted_by' => $this->roles->pluck('name')->values(),
        ];
    }
}

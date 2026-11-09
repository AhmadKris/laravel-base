<?php

declare(strict_types=1);

namespace App\Core\Authorization\Resources;

use App\Core\Authorization\Models\Role;
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
        return [
            'id' => $this->id,
            'name' => $this->name,
            'is_protected' => $this->isProtected(),
            'users_count' => $this->whenCounted('users'),
            'version' => $this->version,
            'created_at' => $this->created_at,
        ];
    }
}

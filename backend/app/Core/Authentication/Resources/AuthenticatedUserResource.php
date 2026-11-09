<?php

declare(strict_types=1);

namespace App\Core\Authentication\Resources;

use App\Modules\UserManagement\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin User
 */
final class AuthenticatedUserResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->uuid,
            'name' => $this->name,
            'email' => $this->email,
            /** @var list<string> */
            'roles' => $this->getRoleNames(),
            /** @var list<string> */
            'permissions' => $this->getAllPermissions()->pluck('name'),
        ];
    }
}

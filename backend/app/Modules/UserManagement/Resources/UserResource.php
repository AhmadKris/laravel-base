<?php

declare(strict_types=1);

namespace App\Modules\UserManagement\Resources;

use App\Modules\UserManagement\Models\User;
use App\Shared\Enums\ActiveStatus;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin User
 */
final class UserResource extends JsonResource
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
            'status' => ActiveStatus::fromBoolean($this->is_active)->value,
            'created_at' => $this->created_at,
        ];
    }
}

<?php

declare(strict_types=1);

namespace App\Modules\Department\Resources;

use App\Modules\Department\Models\Department;
use App\Shared\Enums\ActiveStatus;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Department
 */
final class DepartmentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->uuid,
            'code' => $this->code,
            'name' => $this->name,
            'description' => $this->description,
            'parent_id' => $this->parent?->uuid,
            'status' => ActiveStatus::fromBoolean($this->is_active)->value,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}

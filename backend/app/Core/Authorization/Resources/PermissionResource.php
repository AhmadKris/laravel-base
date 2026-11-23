<?php

declare(strict_types=1);

namespace App\Core\Authorization\Resources;

use App\Core\Authorization\Permissions\PermissionCatalog;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Spatie\Permission\Models\Permission;

/**
 * @mixin Permission
 */
final class PermissionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $definition = app(PermissionCatalog::class)->describe($this->name);

        return [
            'id' => $this->id,
            'name' => $this->name,
            'label' => $definition->label,
            'description' => $definition->description,
            'group' => $definition->group,
            'group_label' => $definition->groupLabel,
            /** @var list<string> */
            'requires' => $definition->requires,
        ];
    }
}

<?php

declare(strict_types=1);

namespace App\Modules\SystemConfiguration\Resources;

use App\Modules\SystemConfiguration\Models\SystemConfiguration;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin SystemConfiguration
 */
final class SystemConfigurationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'key' => $this->key,
            'value' => $this->is_sensitive ? null : $this->value,
            'is_public' => $this->is_public,
            'is_sensitive' => $this->is_sensitive,
            'description' => $this->description,
            'version' => $this->version,
            'updated_at' => $this->updated_at,
        ];
    }
}

<?php

declare(strict_types=1);

namespace App\Core\Audit\Resources;

use App\Modules\UserManagement\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Str;
use Spatie\Activitylog\Models\Activity;

/**
 * @mixin Activity
 */
final class AuditLogResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var User|null $actor */
        $actor = $this->causer;

        return [
            'id' => $this->id,
            'event' => $this->event,
            'actor' => $actor === null ? null : [
                'id' => $actor->uuid,
                'name' => $actor->name,
                'email' => $actor->email,
            ],
            'subject' => $this->subject_type === null ? null : [
                'type' => Str::snake(class_basename($this->subject_type)),
                'id' => $this->subject?->getRouteKey(),
                // A readable name for the list; null once the subject no longer exists.
                'label' => $this->subject?->getAttribute('name') ?? $this->subject?->getAttribute('key'),
            ],
            'properties' => $this->properties,
            'created_at' => $this->created_at,
        ];
    }
}

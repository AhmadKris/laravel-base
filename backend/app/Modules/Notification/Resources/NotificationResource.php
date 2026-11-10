<?php

declare(strict_types=1);

namespace App\Modules\Notification\Resources;

use App\Modules\Notification\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Str;

/**
 * @mixin Notification
 */
final class NotificationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $data = $this->data;

        return [
            'id' => $this->id,
            'type' => $this->type,
            /** @var string */
            'category' => is_string($data['category'] ?? null) ? $data['category'] : Str::before($this->type, '.'),
            /** @var string */
            'title' => is_string($data['title'] ?? null) ? $data['title'] : '',
            /** @var string */
            'message' => is_string($data['message'] ?? null) ? $data['message'] : '',
            /** @var string|null */
            'action_url' => is_string($data['action_url'] ?? null) ? $data['action_url'] : null,
            'is_read' => $this->read_at !== null,
            'read_at' => $this->read_at,
            'created_at' => $this->created_at,
        ];
    }
}

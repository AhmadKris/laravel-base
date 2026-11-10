<?php

declare(strict_types=1);

namespace App\Modules\Notification\Models;

use App\Modules\Notification\Policies\NotificationPolicy;
use App\Modules\UserManagement\Models\User;
use Database\Factories\NotificationFactory;
use Illuminate\Database\Eloquent\Attributes\UseFactory;
use Illuminate\Database\Eloquent\Attributes\UsePolicy;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $type
 * @property string $notifiable_type
 * @property int|string $notifiable_id
 * @property array<string, mixed> $data
 * @property Carbon|null $read_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[UseFactory(NotificationFactory::class)]
#[UsePolicy(NotificationPolicy::class)]
class Notification extends DatabaseNotification
{
    /** @use HasFactory<NotificationFactory> */
    use HasFactory;

    /**
     * @param  Builder<self>  $query
     */
    public function scopeVisibleTo(Builder $query, User $viewer): void
    {
        $query->where('notifiable_type', $viewer->getMorphClass())
            ->where('notifiable_id', $viewer->getKey());
    }
}

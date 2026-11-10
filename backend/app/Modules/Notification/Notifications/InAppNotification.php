<?php

declare(strict_types=1);

namespace App\Modules\Notification\Notifications;

use App\Modules\Notification\Enums\NotificationCategory;
use App\Modules\Notification\Models\Notification as NotificationRecord;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueueAfterCommit;
use Illuminate\Notifications\Notification;

abstract class InAppNotification extends Notification implements ShouldQueueAfterCommit
{
    use Queueable;

    public int $tries = 3;

    public bool $deleteWhenMissingModels = true;

    abstract protected function category(): NotificationCategory;

    abstract protected function type(): string;

    abstract protected function title(): string;

    abstract protected function message(): string;

    protected function actionUrl(): ?string
    {
        return null;
    }

    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function databaseType(object $notifiable): string
    {
        return $this->type();
    }

    public function shouldSend(object $notifiable, string $channel): bool
    {
        // Guard queued retries so an already-persisted notification UUID is not inserted twice.
        return $this->id === null || ! NotificationRecord::query()->whereKey($this->id)->exists();
    }

    /**
     * @return array{category: string, title: string, message: string, action_url: string|null}
     */
    public function toArray(object $notifiable): array
    {
        return [
            'category' => $this->category()->value,
            'title' => $this->title(),
            'message' => $this->message(),
            'action_url' => $this->actionUrl(),
        ];
    }
}

<?php

declare(strict_types=1);

namespace App\Core\Authentication\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Str;

/**
 * Tells the current address that its account is moving to another email, so the owner notices
 * a change they did not make.
 */
final class EmailChangeNotice extends Notification
{
    public function __construct(
        private readonly string $newEmail,
        private readonly bool $completed,
    ) {}

    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $newEmail = self::mask($this->newEmail);

        return $this->completed
            ? (new MailMessage)
                ->subject('Email akun Anda telah diubah')
                ->line("Email login akun Anda telah diubah menjadi {$newEmail}. Email berikutnya dari sistem dikirim ke alamat tersebut.")
                ->line('Jika Anda tidak melakukan perubahan ini, segera hubungi administrator.')
            : (new MailMessage)
                ->subject('Permintaan mengubah email akun Anda')
                ->line("Ada permintaan untuk mengubah email login akun Anda menjadi {$newEmail}. Email akun baru berubah setelah tautan yang dikirim ke alamat tersebut dibuka.")
                ->line('Jika Anda tidak meminta perubahan ini, segera ubah password Anda dan hubungi administrator.');
    }

    /**
     * Shows enough of the address to recognize it without handing it to whoever reads this mailbox.
     */
    private static function mask(string $email): string
    {
        [$local, $domain] = explode('@', $email, 2);

        return Str::substr($local, 0, 2).str_repeat('*', max(3, Str::length($local) - 2)).'@'.$domain;
    }
}

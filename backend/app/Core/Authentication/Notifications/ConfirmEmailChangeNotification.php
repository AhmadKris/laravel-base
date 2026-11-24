<?php

declare(strict_types=1);

namespace App\Core\Authentication\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Sent to the new address, which becomes the login email only after this link is opened.
 */
final class ConfirmEmailChangeNotification extends Notification
{
    public function __construct(
        private readonly string $url,
        private readonly int $expiresInMinutes,
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
        return (new MailMessage)
            ->subject('Konfirmasi email baru akun Anda')
            ->line('Anda meminta alamat ini menjadi email akun Anda. Email login baru berlaku setelah Anda menekan tombol di bawah.')
            ->action('Konfirmasi email', $this->url)
            ->line("Tautan ini berlaku selama {$this->expiresInMinutes} menit.")
            ->line('Jika Anda tidak meminta perubahan ini, abaikan email ini. Email akun tidak akan berubah.');
    }
}

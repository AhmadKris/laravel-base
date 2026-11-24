<?php

declare(strict_types=1);

namespace App\Core\Authentication\Actions;

use App\Core\Audit\AuditLogger;
use App\Core\Authentication\Notifications\ConfirmEmailChangeNotification;
use App\Core\Authentication\Notifications\EmailChangeNotice;
use App\Modules\UserManagement\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;

final readonly class RequestEmailChangeAction
{
    public const int EXPIRES_IN_MINUTES = 60;

    public function __construct(private AuditLogger $auditLogger) {}

    /**
     * Keeps the current email until the new address is confirmed. Only a hash of the token is stored,
     * so a database leak does not hand out working links. A new request replaces the previous one.
     */
    public function execute(User $user, string $email): User
    {
        $token = Str::random(64);

        DB::transaction(function () use ($user, $email, $token): void {
            $user->forceFill([
                'pending_email' => $email,
                'pending_email_token' => hash('sha256', $token),
                'pending_email_expires_at' => now()->addMinutes(self::EXPIRES_IN_MINUTES),
            ])->save();

            $this->auditLogger->record('auth.email_change_requested', $user, ['new_email' => $email], $user);
        });

        // The token stays in the URL fragment so it never reaches server or proxy logs.
        $url = config('app.url').'/confirm-email#'.http_build_query(['id' => $user->uuid, 'token' => $token]);

        Notification::route('mail', $email)->notify(new ConfirmEmailChangeNotification($url, self::EXPIRES_IN_MINUTES));
        $user->notify(new EmailChangeNotice($email, completed: false));

        return $user;
    }
}

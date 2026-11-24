<?php

declare(strict_types=1);

namespace App\Core\Authentication\Actions;

use App\Core\Audit\AuditLogger;
use App\Core\Authentication\Exceptions\InvalidEmailChangeException;
use App\Core\Authentication\Notifications\EmailChangeNotice;
use App\Modules\UserManagement\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\ValidationException;

final readonly class ConfirmEmailChangeAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    /**
     * @throws InvalidEmailChangeException
     * @throws ValidationException
     */
    public function execute(string $uuid, string $token): User
    {
        [$user, $previousEmail] = DB::transaction(function () use ($uuid, $token): array {
            $user = User::query()->where('uuid', $uuid)->where('is_active', true)->lockForUpdate()->first();

            if ($user === null
                || $user->pending_email === null
                || $user->pending_email_token === null
                || $user->pending_email_expires_at?->isFuture() !== true
                || ! hash_equals($user->pending_email_token, hash('sha256', $token))) {
                throw new InvalidEmailChangeException;
            }

            // Another account may have taken the address while the link waited to be opened.
            if (User::withTrashed()->where('email', $user->pending_email)->whereKeyNot($user->id)->exists()) {
                throw ValidationException::withMessages(['email' => 'Email ini sudah dipakai akun lain. Minta perubahan email dengan alamat lain.']);
            }

            $previousEmail = $user->email;

            $user->forceFill([
                'email' => $user->pending_email,
                'email_verified_at' => now(),
                'pending_email' => null,
                'pending_email_token' => null,
                'pending_email_expires_at' => null,
            ])->save();

            $this->auditLogger->record('auth.email_changed', $user, [
                'old' => ['email' => $previousEmail],
                'new' => ['email' => $user->email],
            ], $user);

            return [$user, $previousEmail];
        });

        Notification::route('mail', $previousEmail)->notify(new EmailChangeNotice($user->email, completed: true));

        return $user;
    }
}

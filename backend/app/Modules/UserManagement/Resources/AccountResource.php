<?php

declare(strict_types=1);

namespace App\Modules\UserManagement\Resources;

use App\Modules\UserManagement\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The signed-in user's own account.
 *
 * @mixin User
 */
final class AccountResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $pendingEmail = $this->pending_email !== null && $this->pending_email_expires_at?->isFuture() === true
            ? ['email' => $this->pending_email, 'expires_at' => $this->pending_email_expires_at]
            : null;

        return [
            'id' => $this->uuid,
            'name' => $this->name,
            'email' => $this->email,
            'username' => $this->username,
            /** @var string|null */
            'phone' => $this->phone,
            /** @var array{version: string}|null */
            'avatar' => $this->avatarVersion() === null ? null : ['version' => $this->avatarVersion()],
            /** @var array{email: string, expires_at: string}|null */
            'pending_email' => $pendingEmail,
            /** @var list<string> */
            'roles' => $this->getRoleNames(),
            'last_login_at' => $this->last_login_at,
            'created_at' => $this->created_at,
        ];
    }
}

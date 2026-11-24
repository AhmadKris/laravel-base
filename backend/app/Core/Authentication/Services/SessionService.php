<?php

declare(strict_types=1);

namespace App\Core\Authentication\Services;

use App\Modules\UserManagement\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

final class SessionService
{
    public function endAll(User $user): void
    {
        DB::table('sessions')->where('user_id', $user->getKey())->delete();
    }

    public function endOthers(User $user, string $currentSessionId): int
    {
        return DB::table('sessions')
            ->where('user_id', $user->getKey())
            ->where('id', '!=', $currentSessionId)
            ->delete();
    }

    /**
     * The session ID works like a password for the session, so clients only ever see a hash of it.
     */
    public static function publicId(string $sessionId): string
    {
        return hash('sha256', $sessionId);
    }

    /**
     * The user's sessions, most recently active first.
     *
     * @return list<array{id: string, ip_address: string|null, user_agent: string|null, last_active_at: CarbonImmutable, is_current: bool}>
     */
    public function forUser(User $user, string $currentSessionId): array
    {
        return DB::table('sessions')
            ->where('user_id', $user->getKey())
            ->orderByDesc('last_activity')
            ->get(['id', 'ip_address', 'user_agent', 'last_activity'])
            ->map(fn (object $session): array => [
                'id' => self::publicId($session->id),
                'ip_address' => $session->ip_address,
                'user_agent' => $session->user_agent,
                'last_active_at' => CarbonImmutable::createFromTimestampUTC($session->last_activity),
                'is_current' => $session->id === $currentSessionId,
            ])
            ->values()
            ->all();
    }

    /**
     * @return string|null The real session ID of the user's session with this public ID.
     */
    public function find(User $user, string $publicId): ?string
    {
        return DB::table('sessions')
            ->where('user_id', $user->getKey())
            ->pluck('id')
            ->first(fn (string $id): bool => hash_equals(self::publicId($id), $publicId));
    }

    public function end(string $sessionId): void
    {
        DB::table('sessions')->where('id', $sessionId)->delete();
    }
}

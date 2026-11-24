<?php

declare(strict_types=1);

namespace App\Modules\UserManagement\Actions;

use App\Core\Audit\AuditLogger;
use App\Modules\UserManagement\Models\User;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

final readonly class UpdateAccountAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    /**
     * @param  array{name?: string, phone?: string|null}  $attributes
     */
    public function execute(User $user, array $attributes): User
    {
        DB::transaction(function () use ($user, $attributes): void {
            $user->forceFill($attributes);
            $changes = $user->getDirty();
            $original = $user->getRawOriginal();
            $user->save();

            if ($changes !== []) {
                $this->auditLogger->record('user.updated', $user, [
                    'old' => Arr::only($original, array_keys($changes)),
                    'new' => $changes,
                ], $user);
            }
        });

        return $user;
    }
}

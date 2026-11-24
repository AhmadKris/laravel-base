<?php

declare(strict_types=1);

namespace App\Modules\UserManagement\Actions;

use App\Core\Audit\AuditLogger;
use App\Modules\UserManagement\Models\User;
use App\Modules\UserManagement\Services\AvatarStorage;
use Illuminate\Support\Facades\DB;

final readonly class RemoveAvatarAction
{
    public function __construct(
        private AuditLogger $auditLogger,
        private AvatarStorage $storage,
    ) {}

    public function execute(User $user): void
    {
        $oldPath = $user->avatarPath();

        if ($user->avatar_path === null) {
            return;
        }

        DB::transaction(function () use ($user): void {
            $user->forceFill(['avatar_path' => null])->save();
            $this->auditLogger->record('user.avatar_removed', $user, actor: $user);
        });

        $this->storage->delete($oldPath);
    }
}

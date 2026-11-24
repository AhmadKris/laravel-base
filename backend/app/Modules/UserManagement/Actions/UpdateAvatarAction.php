<?php

declare(strict_types=1);

namespace App\Modules\UserManagement\Actions;

use App\Core\Audit\AuditLogger;
use App\Modules\UserManagement\Models\User;
use App\Modules\UserManagement\Services\AvatarStorage;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Throwable;

final readonly class UpdateAvatarAction
{
    public function __construct(
        private AuditLogger $auditLogger,
        private AvatarStorage $storage,
    ) {}

    /**
     * @throws ValidationException
     */
    public function execute(User $user, UploadedFile $file): User
    {
        $path = $this->storage->store($file);

        try {
            $oldPath = DB::transaction(function () use ($user, $path): ?string {
                $oldPath = $user->avatarPath();
                $user->forceFill(['avatar_path' => $path])->save();
                $this->auditLogger->record('user.avatar_updated', $user, actor: $user);

                return $oldPath;
            });
        } catch (Throwable $exception) {
            // The row still points at the previous photo, so the new one would be left without an owner.
            $this->storage->delete($path);

            throw $exception;
        }

        $this->storage->delete($oldPath);

        return $user;
    }
}

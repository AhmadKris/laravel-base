<?php

declare(strict_types=1);

namespace App\Modules\SystemConfiguration\Actions;

use App\Core\Audit\AuditLogger;
use App\Modules\SystemConfiguration\Enums\BrandingAsset;
use App\Modules\SystemConfiguration\Models\SystemConfiguration;
use App\Modules\UserManagement\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

final class RemoveBrandingAction
{
    public function __construct(private readonly AuditLogger $auditLogger) {}

    public function execute(BrandingAsset $asset, User $actor): void
    {
        $oldPath = DB::transaction(function () use ($asset, $actor): ?string {
            $configuration = SystemConfiguration::query()->where('key', $asset->key())->lockForUpdate()->first();
            $oldPath = $configuration?->brandingPath();

            if ($configuration === null || $oldPath === null) {
                return null;
            }

            $configuration->forceFill([
                'value' => null,
                'updated_by' => $actor->id,
                'version' => $configuration->version + 1,
            ])->save();

            $this->auditLogger->record('system.branding_removed', $configuration, ['asset' => $asset->value], $actor);

            return $oldPath;
        });

        if ($oldPath !== null) {
            Storage::disk(SystemConfiguration::BRANDING_DISK)->delete($oldPath);
        }
    }
}

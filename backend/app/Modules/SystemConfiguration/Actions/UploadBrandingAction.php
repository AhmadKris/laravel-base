<?php

declare(strict_types=1);

namespace App\Modules\SystemConfiguration\Actions;

use App\Core\Audit\AuditLogger;
use App\Modules\SystemConfiguration\Enums\BrandingAsset;
use App\Modules\SystemConfiguration\Models\SystemConfiguration;
use App\Modules\UserManagement\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

final class UploadBrandingAction
{
    public function __construct(private readonly AuditLogger $auditLogger) {}

    public function execute(BrandingAsset $asset, UploadedFile $file, User $actor): SystemConfiguration
    {
        $disk = Storage::disk(SystemConfiguration::BRANDING_DISK);
        $path = $disk->putFileAs(
            SystemConfiguration::BRANDING_DIRECTORY,
            $file,
            Str::random(40).'.'.$file->guessExtension(),
        );

        if ($path === false) {
            throw new \RuntimeException("The {$asset->value} file could not be stored.");
        }

        $details = ['mime_type' => (string) $file->getMimeType(), 'size' => (int) $file->getSize()];

        try {
            [$configuration, $oldPath] = DB::transaction(function () use ($asset, $path, $details, $actor): array {
                $configuration = SystemConfiguration::query()->firstOrCreate(
                    ['key' => $asset->key()],
                    ['description' => $asset->label()],
                );
                $configuration = SystemConfiguration::query()->whereKey($configuration->id)->lockForUpdate()->sole();
                $oldPath = $configuration->brandingPath();

                $configuration->forceFill([
                    'value' => ['path' => $path, ...$details],
                    'updated_by' => $actor->id,
                    'version' => $configuration->version + 1,
                ])->save();

                $this->auditLogger->record('system.branding_updated', $configuration, ['asset' => $asset->value, ...$details], $actor);

                return [$configuration, $oldPath];
            });
        } catch (Throwable $exception) {
            // The row still points at the previous file, so the new one would be left without an owner.
            $disk->delete($path);

            throw $exception;
        }

        if ($oldPath !== null) {
            $disk->delete($oldPath);
        }

        return $configuration;
    }
}

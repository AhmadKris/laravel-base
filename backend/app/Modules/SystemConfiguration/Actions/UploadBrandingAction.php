<?php

declare(strict_types=1);

namespace App\Modules\SystemConfiguration\Actions;

use App\Core\Audit\AuditLogger;
use App\Modules\SystemConfiguration\Enums\BrandingAsset;
use App\Modules\SystemConfiguration\Models\SystemConfiguration;
use App\Modules\UserManagement\Models\User;
use GdImage;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Throwable;

final class UploadBrandingAction
{
    public function __construct(private readonly AuditLogger $auditLogger) {}

    /**
     * @throws ValidationException
     */
    public function execute(BrandingAsset $asset, UploadedFile $file, User $actor): SystemConfiguration
    {
        $image = $this->prepare($asset, $file);
        $disk = Storage::disk(SystemConfiguration::BRANDING_DISK);
        $path = SystemConfiguration::BRANDING_DIRECTORY.'/'.Str::random(40).'.'.$image['extension'];

        if (! $disk->put($path, $image['content'])) {
            throw new RuntimeException("The {$asset->value} file could not be stored.");
        }

        $details = ['mime_type' => $image['mime_type'], 'size' => strlen($image['content'])];

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

    /**
     * Scales the upload down to its display size and writes it again as PNG, so any size can be
     * uploaded without preparing it first. Writing it again also drops anything appended to the
     * original file. ICO is stored as uploaded because GD cannot read it.
     *
     * @return array{content: string, extension: string, mime_type: string}
     *
     * @throws ValidationException
     */
    private function prepare(BrandingAsset $asset, UploadedFile $file): array
    {
        if ($file->guessExtension() === 'ico') {
            return ['content' => $file->getContent(), 'extension' => 'ico', 'mime_type' => 'image/x-icon'];
        }

        // GD raises a warning for damaged data; the false result below reports it to the user instead.
        $source = @imagecreatefromstring($file->getContent());

        if ($source === false) {
            throw ValidationException::withMessages([
                'file' => "{$asset->label()} tidak dapat dibaca. Simpan ulang gambarnya lalu unggah kembali.",
            ]);
        }

        [$width, $height] = [imagesx($source), imagesy($source)];
        $side = max($width, $height);
        [$canvasWidth, $canvasHeight] = $asset->padsToSquare() ? [$side, $side] : [$width, $height];
        [$maxWidth, $maxHeight] = $asset->fitWithin();
        // Only scaled down: enlarging a small image would make it blurry.
        $scale = min(1, $maxWidth / $canvasWidth, $maxHeight / $canvasHeight);

        $target = $this->transparentCanvas(
            max(1, (int) round($canvasWidth * $scale)),
            max(1, (int) round($canvasHeight * $scale)),
        );
        $drawWidth = max(1, (int) round($width * $scale));
        $drawHeight = max(1, (int) round($height * $scale));

        imagecopyresampled(
            $target,
            $source,
            intdiv(imagesx($target) - $drawWidth, 2),
            intdiv(imagesy($target) - $drawHeight, 2),
            0,
            0,
            $drawWidth,
            $drawHeight,
            $width,
            $height,
        );

        ob_start();
        imagepng($target, null, 9);

        return ['content' => (string) ob_get_clean(), 'extension' => 'png', 'mime_type' => 'image/png'];
    }

    private function transparentCanvas(int $width, int $height): GdImage
    {
        $canvas = imagecreatetruecolor($width, $height);

        imagealphablending($canvas, false);
        imagesavealpha($canvas, true);
        imagefill($canvas, 0, 0, (int) imagecolorallocatealpha($canvas, 0, 0, 0, 127));
        imagealphablending($canvas, true);

        return $canvas;
    }
}

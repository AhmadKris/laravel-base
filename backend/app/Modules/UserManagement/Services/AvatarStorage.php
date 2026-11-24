<?php

declare(strict_types=1);

namespace App\Modules\UserManagement\Services;

use App\Modules\UserManagement\Models\User;
use GdImage;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Profile photos live on the private disk under a random name and leave it only through endpoints
 * that check who may see them.
 */
final class AvatarStorage
{
    private const int SIZE = 256;

    /**
     * Crops the upload to a centered square, scales it to 256 pixels, and writes it again as PNG.
     * Writing it again drops anything appended to the original file.
     *
     * @return string The stored path.
     *
     * @throws ValidationException
     */
    public function store(UploadedFile $file): string
    {
        // GD raises a warning for damaged data; the false result below reports it to the user instead.
        $source = @imagecreatefromstring($file->getContent());

        if ($source === false) {
            throw ValidationException::withMessages([
                'file' => 'Foto tidak dapat dibaca. Simpan ulang gambarnya lalu unggah kembali.',
            ]);
        }

        $side = min(imagesx($source), imagesy($source));
        $size = min(self::SIZE, $side);
        $target = $this->transparentCanvas($size);

        imagecopyresampled(
            $target,
            $source,
            0,
            0,
            intdiv(imagesx($source) - $side, 2),
            intdiv(imagesy($source) - $side, 2),
            $size,
            $size,
            $side,
            $side,
        );

        ob_start();
        imagepng($target, null, 9);
        $path = User::AVATAR_DIRECTORY.'/'.Str::random(40).'.png';

        if (! Storage::disk(User::AVATAR_DISK)->put($path, (string) ob_get_clean())) {
            throw new RuntimeException('The profile photo could not be stored.');
        }

        return $path;
    }

    public function delete(?string $path): void
    {
        if ($path !== null) {
            Storage::disk(User::AVATAR_DISK)->delete($path);
        }
    }

    public function response(User $user): StreamedResponse
    {
        $path = $user->avatarPath();
        $disk = Storage::disk(User::AVATAR_DISK);

        if ($path === null || ! $disk->exists($path)) {
            throw new NotFoundHttpException;
        }

        return $disk->response($path, 'avatar.png', [
            'Content-Type' => 'image/png',
            'X-Content-Type-Options' => 'nosniff',
            'Content-Security-Policy' => "default-src 'none'; sandbox",
            // The client adds the version to the URL, so a new photo is fetched right away.
            'Cache-Control' => 'private, max-age=86400',
        ]);
    }

    private function transparentCanvas(int $size): GdImage
    {
        $canvas = imagecreatetruecolor($size, $size);

        imagealphablending($canvas, false);
        imagesavealpha($canvas, true);
        imagefill($canvas, 0, 0, (int) imagecolorallocatealpha($canvas, 0, 0, 0, 127));
        imagealphablending($canvas, true);

        return $canvas;
    }
}

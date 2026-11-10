<?php

declare(strict_types=1);

namespace App\Modules\SystemConfiguration\Requests;

use App\Modules\SystemConfiguration\Enums\BrandingAsset;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\UploadedFile;

final class UploadBrandingRequest extends FormRequest
{
    /**
     * A small file can still decode to a huge bitmap, so the size is read from the header first.
     */
    private const int MAX_PIXELS = 40_000_000;

    /**
     * Both the client extension and the type detected from the content must be allowed.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $asset = $this->asset();
        $extensions = implode(',', $asset->extensions());

        return [
            'file' => [
                'required',
                'file',
                "extensions:{$extensions}",
                "mimes:{$extensions}",
                "max:{$asset->maxKilobytes()}",
                $this->withinPixelLimit(...),
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return $this->asset()->messages();
    }

    private function withinPixelLimit(string $attribute, mixed $value, Closure $fail): void
    {
        $size = $value instanceof UploadedFile ? @getimagesize($value->getRealPath()) : false;

        if ($size === false) {
            $fail("{$this->asset()->label()} tidak dapat dibaca. Simpan ulang gambarnya lalu unggah kembali.");

            return;
        }

        if ($size[0] * $size[1] > self::MAX_PIXELS) {
            $fail("{$this->asset()->label()} terlalu besar. Maksimal 40 megapiksel, misalnya 8000 x 5000 piksel.");
        }
    }

    private function asset(): BrandingAsset
    {
        /** @var BrandingAsset */
        return $this->route('asset');
    }
}

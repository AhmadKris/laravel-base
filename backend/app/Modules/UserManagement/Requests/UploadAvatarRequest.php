<?php

declare(strict_types=1);

namespace App\Modules\UserManagement\Requests;

use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\UploadedFile;

final class UploadAvatarRequest extends FormRequest
{
    /**
     * A small file can still decode to a huge bitmap, so the size is read from the header first.
     */
    private const int MAX_PIXELS = 40_000_000;

    /**
     * Both the client extension and the type detected from the content must be allowed. SVG is
     * refused because it can carry script.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'file' => [
                'required',
                'file',
                'extensions:png,jpg,jpeg,webp',
                'mimes:png,jpg,jpeg,webp',
                'max:2048',
                $this->withinPixelLimit(...),
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'file.required' => 'Pilih foto yang akan diunggah.',
            'file.extensions' => 'Foto harus berupa file PNG, JPG, atau WebP.',
            'file.mimes' => 'Foto harus berupa file PNG, JPG, atau WebP.',
            'file.max' => 'Foto maksimal 2 MB.',
        ];
    }

    private function withinPixelLimit(string $attribute, mixed $value, Closure $fail): void
    {
        $size = $value instanceof UploadedFile ? @getimagesize($value->getRealPath()) : false;

        if ($size === false) {
            $fail('Foto tidak dapat dibaca. Simpan ulang gambarnya lalu unggah kembali.');

            return;
        }

        if ($size[0] * $size[1] > self::MAX_PIXELS) {
            $fail('Foto terlalu besar. Maksimal 40 megapiksel, misalnya 8000 x 5000 piksel.');
        }
    }
}

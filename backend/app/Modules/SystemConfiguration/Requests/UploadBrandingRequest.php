<?php

declare(strict_types=1);

namespace App\Modules\SystemConfiguration\Requests;

use App\Modules\SystemConfiguration\Enums\BrandingAsset;
use Illuminate\Foundation\Http\FormRequest;

final class UploadBrandingRequest extends FormRequest
{
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
                $asset->dimensionsRule(),
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

    private function asset(): BrandingAsset
    {
        /** @var BrandingAsset */
        return $this->route('asset');
    }
}

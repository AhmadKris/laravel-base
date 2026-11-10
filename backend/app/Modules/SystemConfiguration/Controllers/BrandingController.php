<?php

declare(strict_types=1);

namespace App\Modules\SystemConfiguration\Controllers;

use App\Core\Api\Responses\ApiResponse;
use App\Modules\SystemConfiguration\Actions\RemoveBrandingAction;
use App\Modules\SystemConfiguration\Actions\UploadBrandingAction;
use App\Modules\SystemConfiguration\Enums\BrandingAsset;
use App\Modules\SystemConfiguration\Models\SystemConfiguration;
use App\Modules\SystemConfiguration\Requests\UploadBrandingRequest;
use App\Modules\UserManagement\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Logo and favicon are the only files served without login, as allowed by SECURITY_SPECIFICATION.md section 10.5.
 */
final class BrandingController
{
    /**
     * Defaults apply until an installation has seeded or changed the display keys.
     */
    private const array DISPLAY_DEFAULTS = [
        'show_name' => true,
        'background' => 'transparent',
        'size' => 'medium',
    ];

    public function index(): JsonResponse
    {
        $displayKeys = array_map(fn (string $name): string => "company.logo_{$name}", array_keys(self::DISPLAY_DEFAULTS));
        $configurations = SystemConfiguration::query()
            ->whereIn('key', [...BrandingAsset::keys(), ...$displayKeys])
            ->get()
            ->keyBy('key');

        $branding = [];

        foreach (BrandingAsset::cases() as $asset) {
            $configuration = $configurations->get($asset->key());

            $branding[$asset->responseKey()] = $configuration?->brandingPath() === null
                ? null
                : ['version' => $configuration->version];
        }

        $branding['display'] = [];

        foreach (self::DISPLAY_DEFAULTS as $name => $default) {
            $branding['display'][$name] = $configurations->get("company.logo_{$name}")->value ?? $default;
        }

        return ApiResponse::success($branding, 'Branding retrieved successfully');
    }

    public function show(BrandingAsset $asset): StreamedResponse
    {
        $configuration = SystemConfiguration::query()->where('key', $asset->key())->first();
        $path = $configuration?->brandingPath();
        $disk = Storage::disk(SystemConfiguration::BRANDING_DISK);

        if ($configuration === null || $path === null || ! $disk->exists($path)) {
            throw new NotFoundHttpException;
        }

        return $disk->response($path, "{$asset->value}.".pathinfo($path, PATHINFO_EXTENSION), [
            'Content-Type' => $configuration->brandingContentType(),
            'X-Content-Type-Options' => 'nosniff',
            'Content-Security-Policy' => "default-src 'none'; sandbox",
            // The client adds the version to the URL, so a new upload is fetched right away.
            'Cache-Control' => 'public, max-age=86400',
        ]);
    }

    public function store(UploadBrandingRequest $request, BrandingAsset $asset, UploadBrandingAction $action): JsonResponse
    {
        $this->authorizeUpdate($asset);

        /** @var UploadedFile $file */
        $file = $request->validated('file');

        $configuration = $action->execute($asset, $file, $this->actor($request));

        return ApiResponse::success(['version' => $configuration->version], 'Branding updated successfully');
    }

    public function destroy(Request $request, BrandingAsset $asset, RemoveBrandingAction $action): Response
    {
        $this->authorizeUpdate($asset);

        $action->execute($asset, $this->actor($request));

        return response()->noContent();
    }

    private function authorizeUpdate(BrandingAsset $asset): void
    {
        Gate::authorize('update', SystemConfiguration::query()->firstOrNew(['key' => $asset->key()]));
    }

    private function actor(Request $request): User
    {
        /** @var User */
        return $request->user();
    }
}

<?php

declare(strict_types=1);

namespace App\Core\Api\Responses;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\JsonResource;

final class ApiResponse
{
    /**
     * @param  JsonResource|array<mixed>|null  $data
     */
    public static function success(
        JsonResource|array|null $data = null,
        string $message = 'Request successful',
        int $status = 200,
    ): JsonResponse {
        return new JsonResponse([
            'success' => true,
            'message' => $message,
            'data' => $data instanceof JsonResource ? $data->resolve() : $data,
            'meta' => null,
        ], $status);
    }

    /**
     * @param  LengthAwarePaginator<int, mixed>  $paginator
     * @param  class-string<JsonResource>  $resource
     */
    public static function paginated(
        LengthAwarePaginator $paginator,
        string $resource,
        string $message = 'Request successful',
    ): JsonResponse {
        return new JsonResponse([
            'success' => true,
            'message' => $message,
            'data' => $resource::collection($paginator)->resolve(),
            'meta' => [
                'pagination' => [
                    'current_page' => $paginator->currentPage(),
                    'per_page' => $paginator->perPage(),
                    'total' => $paginator->total(),
                    'last_page' => $paginator->lastPage(),
                    'from' => $paginator->firstItem(),
                    'to' => $paginator->lastItem(),
                ],
            ],
        ]);
    }

    /**
     * @param  array<string, array<int, string>>|null  $errors
     * @param  array<string, mixed>  $headers
     */
    public static function error(
        string $message,
        string $code,
        int $status,
        ?array $errors = null,
        array $headers = [],
    ): JsonResponse {
        return new JsonResponse([
            'success' => false,
            'message' => $message,
            'code' => $code,
            'data' => null,
            'errors' => $errors,
            'meta' => null,
        ], $status, $headers);
    }
}

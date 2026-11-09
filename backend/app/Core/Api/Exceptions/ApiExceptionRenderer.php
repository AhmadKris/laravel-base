<?php

declare(strict_types=1);

namespace App\Core\Api\Exceptions;

use App\Core\Api\Responses\ApiResponse;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Throwable;

final class ApiExceptionRenderer
{
    /**
     * @var array<int, array{string, string}>
     */
    private const array HTTP_ERRORS = [
        400 => ['INVALID_REQUEST', 'The request is invalid.'],
        403 => ['AUTH_FORBIDDEN', 'You are not allowed to perform this action.'],
        404 => ['RESOURCE_NOT_FOUND', 'The requested resource was not found.'],
        405 => ['METHOD_NOT_ALLOWED', 'The request method is not allowed.'],
        409 => ['RESOURCE_CONFLICT', 'The request conflicts with the current state of the resource.'],
        413 => ['PAYLOAD_TOO_LARGE', 'The request payload is too large.'],
        415 => ['UNSUPPORTED_MEDIA_TYPE', 'The media type is not supported.'],
        419 => ['CSRF_TOKEN_MISMATCH', 'The session has expired. Please try again.'],
        429 => ['TOO_MANY_REQUESTS', 'Too many requests. Please try again later.'],
        503 => ['SERVICE_UNAVAILABLE', 'The service is temporarily unavailable.'],
    ];

    public function __invoke(Throwable $exception, Request $request): ?JsonResponse
    {
        if ($exception instanceof HttpResponseException) {
            return null;
        }

        if (! $request->is('api/*') && ! $request->expectsJson()) {
            return null;
        }

        return match (true) {
            $exception instanceof ValidationException => ApiResponse::error(
                'Validation failed',
                'VALIDATION_FAILED',
                422,
                $exception->errors(),
            ),
            $exception instanceof AuthenticationException => ApiResponse::error(
                'Unauthenticated.',
                'AUTH_UNAUTHENTICATED',
                401,
            ),
            $exception instanceof ApiException => ApiResponse::error(
                $exception->getMessage(),
                $exception->errorCode,
                $exception->status,
            ),
            $exception instanceof HttpExceptionInterface => $this->renderHttpException($exception),
            default => $this->renderServerError(),
        };
    }

    private function renderHttpException(HttpExceptionInterface $exception): JsonResponse
    {
        $status = $exception->getStatusCode();

        if (! isset(self::HTTP_ERRORS[$status])) {
            return $this->renderServerError();
        }

        [$code, $message] = self::HTTP_ERRORS[$status];

        return ApiResponse::error($message, $code, $status, headers: $exception->getHeaders());
    }

    private function renderServerError(): JsonResponse
    {
        return ApiResponse::error('An unexpected error occurred.', 'SYSTEM_INTERNAL_ERROR', 500);
    }
}

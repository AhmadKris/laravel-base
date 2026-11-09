<?php

declare(strict_types=1);

namespace App\Modules\Monitoring\Controllers;

use Illuminate\Http\JsonResponse;

final class HealthController
{
    public function __invoke(): JsonResponse
    {
        return new JsonResponse([
            'status' => 'ok',
            'service' => 'enterprise-api',
        ]);
    }
}

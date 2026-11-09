<?php

declare(strict_types=1);

use App\Core\Api\Responses\ApiResponse;
use Illuminate\Pagination\LengthAwarePaginator;
use Tests\Fixtures\Http\SampleResource;

it('wraps a resource in the success envelope', function () {
    $response = ApiResponse::success(new SampleResource(['name' => 'Finance']), 'Created', 201);

    expect($response->getStatusCode())->toBe(201)
        ->and($response->getData(true))->toBe([
            'success' => true,
            'message' => 'Created',
            'data' => ['name' => 'Finance'],
            'meta' => null,
        ]);
});

it('adds pagination metadata to collections', function () {
    $paginator = new LengthAwarePaginator([['name' => 'A'], ['name' => 'B']], 45, 20, 2);

    expect(ApiResponse::paginated($paginator, SampleResource::class)->getData(true))->toBe([
        'success' => true,
        'message' => 'Request successful',
        'data' => [['name' => 'A'], ['name' => 'B']],
        'meta' => [
            'pagination' => [
                'current_page' => 2,
                'per_page' => 20,
                'total' => 45,
                'last_page' => 3,
                'from' => 21,
                'to' => 22,
            ],
        ],
    ]);
});

it('builds the error envelope', function () {
    $response = ApiResponse::error('Conflict', 'SAMPLE_CONFLICT', 409, ['field' => ['Taken.']]);

    expect($response->getStatusCode())->toBe(409)
        ->and($response->getData(true))->toBe([
            'success' => false,
            'message' => 'Conflict',
            'code' => 'SAMPLE_CONFLICT',
            'data' => null,
            'errors' => ['field' => ['Taken.']],
            'meta' => null,
        ]);
});

<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\File;

it('generates the openapi document from registered routes', function () {
    $path = storage_path('framework/testing/openapi-test.json');
    File::ensureDirectoryExists(dirname($path));

    Artisan::call('scramble:export', ['--path' => $path]);

    $document = File::json($path);
    File::delete($path);

    expect($document['openapi'])->toStartWith('3.')
        ->and($document['paths'])->toHaveKey('/v1/health');
});

it('blocks the documentation outside the local environment', function () {
    $this->get('/docs/api')->assertForbidden();
    $this->get('/docs/api.json')->assertForbidden();
});

it('documents exactly the endpoints listed in the specification', function () {
    $path = storage_path('framework/testing/openapi-endpoints.json');
    File::ensureDirectoryExists(dirname($path));

    Artisan::call('scramble:export', ['--path' => $path]);

    $document = File::json($path);
    File::delete($path);

    $exported = collect($document['paths'])
        ->flatMap(fn (array $operations, string $path) => collect(array_keys($operations))
            ->intersect(['get', 'post', 'put', 'patch', 'delete'])
            ->map(fn (string $method): string => strtoupper($method).' '.normalizePath('/api'.$path)))
        ->sort()
        ->values()
        ->all();

    $documented = collect(array_keys(documentedEndpoints()))
        ->filter(fn (string $endpoint): bool => str_contains($endpoint, ' /api/v1/'))
        ->sort()
        ->values()
        ->all();

    expect($exported)->toBe($documented);
});

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

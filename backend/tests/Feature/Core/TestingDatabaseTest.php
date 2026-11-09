<?php

declare(strict_types=1);

use Illuminate\Support\Facades\DB;

it('runs against the dedicated mysql test database', function () {
    expect(DB::connection()->getDriverName())->toBe('mysql')
        ->and(DB::connection()->getDatabaseName())->toBe('laravel_base_test');
});

<?php

declare(strict_types=1);

use App\Core\Routing\ModuleRoutes;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

it('registers module routes under the versioned api prefix', function () {
    ModuleRoutes::loadFrom(base_path('tests/Fixtures/Modules'));

    $this->getJson('/api/v1/sample-module')
        ->assertOk()
        ->assertExactJson(['module' => 'sample']);

    $route = Route::getRoutes()->match(Request::create('/api/v1/sample-module'));

    expect($route->middleware())->toContain('api');
});

it('does not expose module routes outside the versioned prefix', function () {
    ModuleRoutes::loadFrom(base_path('tests/Fixtures/Modules'));

    $this->getJson('/sample-module')->assertNotFound();
});

it('ignores a modules path that has no route files', function () {
    $routesBefore = Route::getRoutes()->count();

    ModuleRoutes::loadFrom(base_path('tests/Fixtures/Missing'));

    expect(Route::getRoutes()->count())->toBe($routesBefore);
});

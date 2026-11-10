<?php

declare(strict_types=1);

use Database\Seeders\RolePermissionSeeder;
use Dedoc\Scramble\Http\Middleware\RestrictedDocsAccess;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Spatie\Permission\Models\Permission;

uses(RefreshDatabase::class);

/**
 * Every registered route as "METHOD /path" => its middleware.
 *
 * @return array<string, list<string>>
 */
function registeredEndpoints(): array
{
    $endpoints = [];

    foreach (Route::getRoutes() as $route) {
        foreach (array_diff($route->methods(), ['HEAD']) as $method) {
            $endpoints[$method.' '.normalizePath($route->uri())] = array_values(array_map('strval', $route->gatherMiddleware()));
        }
    }

    return $endpoints;
}

/**
 * Differences between the routes and the table, as readable lines. Empty when they agree.
 *
 * @return list<string>
 */
function routeProtectionProblems(): array
{
    $documented = documentedEndpoints();
    $problems = [];

    foreach (registeredEndpoints() as $endpoint => $middleware) {
        if (! array_key_exists($endpoint, $documented)) {
            $problems[] = "{$endpoint} is not listed in API_SPECIFICATION.md section 16.4";

            continue;
        }

        $access = $documented[$endpoint];
        $requiresLogin = collect($middleware)->contains(fn (string $name): bool => $name === 'auth' || str_starts_with($name, 'auth:'));
        $permissions = collect($middleware)->filter(fn (string $name): bool => str_starts_with($name, 'permission:'))->values()->all();

        $expected = match ($access) {
            'Publik' => ! $requiresLogin && $permissions === [],
            'Login' => $requiresLogin && $permissions === [],
            'Lokal' => in_array(RestrictedDocsAccess::class, $middleware, true),
            default => $requiresLogin && $permissions === ["permission:{$access}"],
        };

        if (! $expected) {
            $problems[] = "{$endpoint} should be {$access} but has [".implode(', ', $middleware).']';
        }
    }

    foreach (array_diff_key($documented, registeredEndpoints()) as $endpoint => $access) {
        $problems[] = "{$endpoint} is listed in API_SPECIFICATION.md section 16.4 but has no route";
    }

    return $problems;
}

it('reads the endpoint table from the specification', function () {
    expect(documentedEndpoints())
        ->toHaveKey('GET /api/v1/users/{}', 'user.view')
        ->toHaveKey('POST /login', 'Publik')
        ->toHaveKey('GET /docs/api', 'Lokal');
});

it('protects every route as the specification lists it', function () {
    expect(routeProtectionProblems())->toBe([]);
});

it('fails for a new route that has no protection', function () {
    Route::middleware('api')->get('api/v1/probe-records', fn () => []);
    Route::middleware(['api', 'auth:sanctum'])->delete('api/v1/users/{user}/probe', fn () => []);

    expect(routeProtectionProblems())->toContain(
        'GET /api/v1/probe-records is not listed in API_SPECIFICATION.md section 16.4',
        'DELETE /api/v1/users/{}/probe is not listed in API_SPECIFICATION.md section 16.4',
    );
});

it('fails when a documented route loses its permission', function () {
    Route::middleware(['api', 'auth:sanctum'])->get('api/v1/audit-logs', fn () => []);

    expect(routeProtectionProblems())->toContain('GET /api/v1/audit-logs should be audit.view but has [api, auth:sanctum]');
});

it('lists only permissions that exist', function () {
    $this->seed(RolePermissionSeeder::class);

    $permissions = collect(documentedEndpoints())
        ->reject(fn (string $access): bool => in_array($access, ['Publik', 'Login', 'Lokal'], true))
        ->unique()
        ->values();

    expect($permissions->diff(Permission::query()->pluck('name'))->values()->all())->toBe([]);
});

it('does not serve private storage through a route', function () {
    $this->get('/storage/branding/'.str_repeat('a', 40).'.png')->assertNotFound();
});

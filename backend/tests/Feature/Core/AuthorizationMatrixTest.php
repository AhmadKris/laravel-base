<?php

declare(strict_types=1);

use App\Core\Authorization\Models\Role;
use App\Modules\UserManagement\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Permission;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
});

/**
 * Documented endpoints with the given kind of access, with every path parameter filled in.
 * Permission is checked before the resource is looked up, so the value never has to exist.
 *
 * @return array<string, array{string, string, string}>
 */
function protectedEndpoints(bool $withPermissionOnly): array
{
    return collect(documentedEndpoints())
        ->reject(fn (string $access): bool => in_array($access, $withPermissionOnly ? ['Publik', 'Lokal', 'Login'] : ['Publik', 'Lokal'], true))
        ->mapWithKeys(function (string $access, string $endpoint): array {
            [$method, $path] = explode(' ', $endpoint, 2);

            return [$endpoint => [$method, str_replace('{}', '999', $path), $access]];
        })
        ->all();
}

/**
 * Whether each role holds each permission according to the tables in AUTHORIZATION_MATRIX.md section 5.
 *
 * @return array<string, array<string, bool>> permission => role => granted
 */
function matrixGrants(): array
{
    $document = str_replace("\r\n", "\n", (string) file_get_contents(DOCS_PATH.'/AUTHORIZATION_MATRIX.md'));
    $section = Str::before(Str::after($document, '# 5. Permission Matrix'), "\n# 6.");
    $grants = [];

    foreach (explode("\n## ", $section) as $table) {
        if (! preg_match('/^\| Permission \|(.+)\|$/m', $table, $header)) {
            continue;
        }

        $roles = array_map('trim', explode('|', trim($header[1])));

        preg_match_all('/^\| ([a-z_]+\.[a-z_]+) \|(.+)\|$/m', $table, $rows, PREG_SET_ORDER);

        foreach ($rows as [, $permission, $cells]) {
            foreach (array_map('trim', explode('|', trim($cells))) as $index => $cell) {
                $grants[$permission][$roles[$index]] = $cell !== '-';
            }
        }
    }

    return $grants;
}

it('rejects guests on every endpoint that needs a login', function (string $method, string $path) {
    $this->json($method, $path)
        ->assertUnauthorized()
        ->assertJsonPath('code', 'AUTH_UNAUTHENTICATED');
})->with(fn (): array => protectedEndpoints(withPermissionOnly: false));

it('rejects a user without permissions on every endpoint that needs one', function (string $method, string $path) {
    $this->actingAs(User::factory()->create())
        ->json($method, $path)
        ->assertForbidden()
        ->assertJsonPath('code', 'AUTH_FORBIDDEN');
})->with(fn (): array => protectedEndpoints(withPermissionOnly: true));

it('reads the permission matrix from the document', function () {
    expect(matrixGrants())
        ->toHaveKey('user.view')
        ->and(matrixGrants()['role.create'])->toMatchArray(['Super Admin' => true, 'Admin' => false]);
});

it('gives every seeded role exactly the permissions of the matrix', function (string $role) {
    $grants = matrixGrants();
    $seeded = Permission::query()->pluck('name');

    $expected = $seeded
        ->filter(fn (string $permission): bool => $grants[$permission][$role] ?? false)
        ->sort()
        ->values()
        ->all();

    $actual = Role::findByName($role, 'web')->permissions->pluck('name')->sort()->values()->all();

    expect($actual)->toBe($expected);
})->with(['Super Admin', 'Admin', 'Staff', 'Viewer']);

it('lists every seeded permission in the matrix', function () {
    $missing = Permission::query()->pluck('name')->diff(array_keys(matrixGrants()))->values()->all();

    expect($missing)->toBe([]);
});

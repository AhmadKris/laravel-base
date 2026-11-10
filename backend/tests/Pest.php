<?php

declare(strict_types=1);

use App\Modules\UserManagement\Models\User;
use Illuminate\Support\Str;
use Tests\TestCase;

pest()->extend(TestCase::class)->in('Feature');

const UNKNOWN_USER = '01932f5e-1234-7000-8000-123456789abc';

/**
 * @param  array<string, mixed>  $attributes
 */
function userWithRole(string $role, array $attributes = []): User
{
    $user = User::factory()->create($attributes);
    $user->assignRole($role);

    return $user;
}

/**
 * Endpoints listed in API_SPECIFICATION.md section 16.4, as "METHOD /path" => access.
 * Path parameters are reduced to "{}" because the table and the routes name them differently.
 *
 * @return array<string, string>
 */
function documentedEndpoints(): array
{
    $section = Str::before(
        Str::after(str_replace("\r\n", "\n", (string) file_get_contents(base_path('../docs/API_SPECIFICATION.md'))), '## 16.4 Endpoint Base v1'),
        "\n# ",
    );

    $endpoints = [];

    foreach ([['### API (`/api/v1`)', '/api/v1'], ['### Di luar `/api/v1`', '']] as [$heading, $prefix]) {
        $table = Str::before(Str::after($section, $heading), "\n### ");
        preg_match_all('/^\| (GET|POST|PUT|PATCH|DELETE) \| (\S+) \| `?([^`|\s]+)`? \|$/m', $table, $rows, PREG_SET_ORDER);

        foreach ($rows as [, $method, $path, $access]) {
            $endpoints[$method.' '.normalizePath($prefix.$path)] = $access;
        }
    }

    return $endpoints;
}

function normalizePath(string $path): string
{
    return (string) preg_replace('/\{[^}]+\}/', '{}', '/'.ltrim($path, '/'));
}

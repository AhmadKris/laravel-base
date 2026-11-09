<?php

declare(strict_types=1);

use App\Modules\UserManagement\Models\User;
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

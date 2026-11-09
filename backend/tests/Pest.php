<?php

declare(strict_types=1);

use App\Modules\UserManagement\Models\User;
use Tests\TestCase;

pest()->extend(TestCase::class)->in('Feature');

/**
 * @param  array<string, mixed>  $attributes
 */
function userWithRole(string $role, array $attributes = []): User
{
    $user = User::factory()->create($attributes);
    $user->assignRole($role);

    return $user;
}

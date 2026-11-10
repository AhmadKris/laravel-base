<?php

declare(strict_types=1);

use App\Core\Audit\AuditLogger;
use App\Core\Authorization\Models\Role;
use App\Modules\Notification\Models\Notification;
use App\Modules\UserManagement\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

function queriesFor(mixed $test, User $actor, string $url): int
{
    DB::flushQueryLog();
    DB::enableQueryLog();
    $test->actingAs($actor)->getJson($url)->assertOk();
    $count = count(DB::getQueryLog());
    DB::disableQueryLog();

    return $count;
}

it('runs the same number of queries regardless of how many rows are listed', function (string $url, Closure $addRows) {
    $this->seed(RolePermissionSeeder::class);
    $actor = userWithRole('Super Admin');

    $addRows($actor, 2);
    queriesFor($this, $actor, $url);
    $withFewRows = queriesFor($this, $actor, $url);

    $addRows($actor, 10);
    queriesFor($this, $actor, $url);
    $withManyRows = queriesFor($this, $actor, $url);

    expect($withManyRows)->toBe($withFewRows);
})->with([
    'users' => ['/api/v1/users', function (User $actor, int $count): void {
        User::factory()->count($count)->create()->each(fn (User $user) => $user->assignRole('Staff'));
    }],
    'roles' => ['/api/v1/roles', function (User $actor, int $count): void {
        foreach (range(1, $count) as $index) {
            Role::query()->create(['name' => 'Role '.fake()->unique()->numerify('#####'), 'guard_name' => 'web']);
        }
    }],
    'audit logs' => ['/api/v1/audit-logs', function (User $actor, int $count): void {
        foreach (User::factory()->count($count)->create() as $subject) {
            app(AuditLogger::class)->record('user.updated', $subject, [], $subject);
        }
    }],
    'notifications' => ['/api/v1/notifications', function (User $actor, int $count): void {
        Notification::factory()->count($count)->forUser($actor)->create();
    }],
]);

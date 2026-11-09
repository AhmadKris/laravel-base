<?php

declare(strict_types=1);

use App\Core\Authorization\Models\Role;
use App\Core\Authorization\Services\RoleAssignmentService;
use App\Modules\UserManagement\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->service = app(RoleAssignmentService::class);
});

it('applies the assignment policy of each role', function (string $actorRole, string $target, bool $allowed) {
    expect($this->service->canAssign(userWithRole($actorRole), $target))->toBe($allowed);
})->with([
    'admin cannot grant super admin' => ['Admin', 'Super Admin', false],
    'admin cannot grant admin' => ['Admin', 'Admin', false],
    'admin cannot grant system admin' => ['Admin', 'System Admin', false],
    'admin can grant staff' => ['Admin', 'Staff', true],
    'admin can grant viewer' => ['Admin', 'Viewer', true],
    'super admin can grant admin' => ['Super Admin', 'Admin', true],
    'super admin can grant staff' => ['Super Admin', 'Staff', true],
    'super admin can grant super admin' => ['Super Admin', 'Super Admin', true],
    'staff cannot grant viewer' => ['Staff', 'Viewer', false],
    'viewer cannot grant staff' => ['Viewer', 'Staff', false],
]);

it('lets the super admin grant custom roles but not an admin', function () {
    Role::create(['name' => 'Auditor', 'guard_name' => 'web']);

    expect($this->service->canAssign(userWithRole('Super Admin'), 'Auditor'))->toBeTrue()
        ->and($this->service->canAssign(userWithRole('Admin'), 'Auditor'))->toBeFalse();
});

it('denies users without a role', function () {
    expect($this->service->canAssign(User::factory()->create(), 'Staff'))->toBeFalse();
});

it('combines the policies of multiple roles', function () {
    $user = User::factory()->create();
    $user->assignRole(['Staff', 'Admin']);

    expect($this->service->canAssign($user, 'Viewer'))->toBeTrue();
});
